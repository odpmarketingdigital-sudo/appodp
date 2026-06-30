import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Mapeia o status do Stripe para o status interno da assinatura. */
function mapStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return status;
  }
}

/**
 * No Stripe atual, `current_period_end` vive no item da assinatura
 * (e não mais no topo do objeto Subscription).
 */
function periodEndFromSubscription(subscription: Stripe.Subscription): Date | null {
  const timestamp = subscription.items.data[0]?.current_period_end;
  return typeof timestamp === "number" ? new Date(timestamp * 1000) : null;
}

export async function POST(request: NextRequest): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não configurado no ambiente." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Cabeçalho stripe-signature ausente." },
      { status: 400 },
    );
  }

  // Corpo bruto (raw) é obrigatório para validar a assinatura.
  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "assinatura inválida";
    return NextResponse.json(
      { error: `Falha na verificação do webhook: ${message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.companyId;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null);

        if (companyId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await prisma.subscription.updateMany({
            where: { companyId },
            data: {
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id ?? null,
              status: "active",
              currentPeriodEnd: periodEndFromSubscription(subscription),
            },
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const companyId = subscription.metadata?.companyId;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const status =
          event.type === "customer.subscription.deleted"
            ? "canceled"
            : mapStatus(subscription.status);

        await prisma.subscription.updateMany({
          where: companyId ? { companyId } : { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id ?? null,
            status,
            currentPeriodEnd: periodEndFromSubscription(subscription),
          },
        });
        break;
      }

      default:
        // Eventos não tratados são ignorados com sucesso.
        break;
    }
  } catch {
    return NextResponse.json(
      { error: "Erro ao processar o evento do Stripe." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

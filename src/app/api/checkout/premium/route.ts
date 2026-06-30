import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Cria uma sessão de Checkout do Stripe (assinatura Premium) para a empresa do
 * usuário autenticado e retorna a URL para redirecionamento.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PREMIUM_PRICE_ID não configurado no ambiente." },
      { status: 500 },
    );
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "Nenhuma empresa associada ao usuário." },
      { status: 400 },
    );
  }

  const company = membership.company;
  const stripe = getStripe();

  // Garante um Customer do Stripe vinculado à empresa (reaproveita se existir).
  const existing = await prisma.subscription.findUnique({
    where: { companyId: company.id },
  });

  let customerId = existing?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: company.name,
      metadata: { companyId: company.id },
    });
    customerId = customer.id;

    await prisma.subscription.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        stripeCustomerId: customerId,
        status: "free",
      },
      update: { stripeCustomerId: customerId },
    });
  }

  const origin = request.nextUrl.origin;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/settings?checkout=success`,
    cancel_url: `${origin}/dashboard/settings?checkout=cancel`,
    metadata: { companyId: company.id },
    subscription_data: { metadata: { companyId: company.id } },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

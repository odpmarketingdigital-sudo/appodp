import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { isValidPlanPriceId, TRIAL_PERIOD_DAYS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const checkoutBodySchema = z.object({
  priceId: z.string().min(1, "priceId é obrigatório."),
});

/**
 * Cria uma sessão de Checkout do Stripe para o plano selecionado,
 * com 7 dias de teste gratuito, e retorna a URL para redirecionamento.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const parsed = checkoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe um priceId válido." },
      { status: 400 },
    );
  }

  const { priceId } = parsed.data;
  if (!isValidPlanPriceId(priceId)) {
    return NextResponse.json(
      { error: "Plano selecionado não é válido." },
      { status: 400 },
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
    metadata: { companyId: company.id, priceId },
    subscription_data: {
      trial_period_days: TRIAL_PERIOD_DAYS,
      metadata: { companyId: company.id },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

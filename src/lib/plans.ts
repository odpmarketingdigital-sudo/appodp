/** Período de testes gratuito (dias) em novas assinaturas. */
export const TRIAL_PERIOD_DAYS = 7;

/** Quantidade máxima de clientes ativos no plano gratuito. */
export const FREE_PLAN_CLIENT_LIMIT = 1;

export type StripePlan = {
  id: "basic" | "standard" | "pro";
  name: string;
  priceId: string;
  clientLimit: number;
  priceLabel: string;
};

/** Planos de assinatura ODP Digital (Stripe Price IDs). */
export const STRIPE_PLANS: readonly StripePlan[] = [
  {
    id: "basic",
    name: "Basic ODP Digital",
    priceId: "price_1ToRnT8dWuBIgGXnxrZ3Kq7a",
    clientLimit: 3,
    priceLabel: "R$ 29,90",
  },
  {
    id: "standard",
    name: "Standart ODP Digital",
    priceId: "price_1To99p8dWuBIgGXncJpRvd8V",
    clientLimit: 5,
    priceLabel: "R$ 49,90",
  },
  {
    id: "pro",
    name: "Pro ODP Digital",
    priceId: "price_1ToRtN8dWuBIgGXncfzGEmda",
    clientLimit: 10,
    priceLabel: "R$ 89,90",
  },
] as const;

const PLAN_BY_PRICE_ID = new Map(
  STRIPE_PLANS.map((plan) => [plan.priceId, plan]),
);

/** Retorna o plano correspondente ao Price ID do Stripe, ou `null`. */
export function getPlanByPriceId(
  priceId: string | null | undefined,
): StripePlan | null {
  if (!priceId) return null;
  return PLAN_BY_PRICE_ID.get(priceId) ?? null;
}

/** Valida se o Price ID pertence a um plano conhecido. */
export function isValidPlanPriceId(priceId: string): boolean {
  return PLAN_BY_PRICE_ID.has(priceId);
}

/** Opções de plano para o painel Super Admin (inclui Free). */
export const ADMIN_PLAN_OPTIONS = [
  { value: "free", label: "Free (Gratuito)" },
  ...STRIPE_PLANS.map((plan) => ({
    value: plan.priceId,
    label: plan.name,
  })),
] as const;

/** Valor do select de plano a partir da assinatura atual. */
export function planSelectValue(
  status: string,
  stripePriceId: string | null | undefined,
): string {
  if (status === "free" || !stripePriceId) return "free";
  return stripePriceId;
}

/** Valida opção de plano do admin (Free ou Price ID conhecido). */
export function isValidAdminPlanValue(value: string): boolean {
  return value === "free" || isValidPlanPriceId(value);
}


/** Limite de clientes conforme status e plano da assinatura. */
export function resolveClientLimit(
  status: string,
  stripePriceId: string | null | undefined,
): { limit: number; plan: StripePlan | null; isSubscribed: boolean } {
  const isSubscribed = status === "active" || status === "trialing";
  const plan = isSubscribed ? getPlanByPriceId(stripePriceId) : null;
  const limit = plan?.clientLimit ?? FREE_PLAN_CLIENT_LIMIT;

  return { limit, plan, isSubscribed };
}

/** Rótulo amigável do status da assinatura no banco. */
export function subscriptionStatusLabel(status: string): string {
  switch (status) {
    case "trialing":
      return "Período de testes";
    case "active":
      return "Ativo";
    case "past_due":
      return "Inadimplente";
    case "canceled":
      return "Cancelado";
    case "free":
      return "Gratuito";
    default:
      return status;
  }
}

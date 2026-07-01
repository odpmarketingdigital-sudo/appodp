import { prisma } from "@/lib/prisma";
import {
  resolveClientLimit,
  type StripePlan,
} from "@/lib/plans";

/** Status que liberam recursos pagos (assinatura ativa ou em testes). */
export function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export type CompanyPlanInfo = {
  isSubscribed: boolean;
  status: string;
  plan: StripePlan | null;
  planName: string;
  clientLimit: number;
};

/** Plano atual de uma empresa, derivado da assinatura Stripe. */
export async function getCompanyPlan(
  companyId: string,
): Promise<CompanyPlanInfo> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    select: { status: true, stripePriceId: true },
  });

  const status = subscription?.status ?? "free";
  const { limit, plan, isSubscribed } = resolveClientLimit(
    status,
    subscription?.stripePriceId,
  );

  return {
    isSubscribed,
    status,
    plan,
    planName: plan?.name ?? "Gratuito",
    clientLimit: limit,
  };
}

export type ClientLimitState = {
  isSubscribed: boolean;
  planName: string;
  count: number;
  limit: number;
  atLimit: boolean;
};

/**
 * Estado do limite de clientes da empresa conforme o plano ativo
 * (Gratuito: 1 | Basic: 3 | Standart: 5 | Pro: 10).
 */
export async function getClientLimitState(
  companyId: string,
): Promise<ClientLimitState> {
  const { isSubscribed, planName, clientLimit } =
    await getCompanyPlan(companyId);

  const count = await prisma.client.count({
    where: { companyId, isActive: true },
  });

  return {
    isSubscribed,
    planName,
    count,
    limit: clientLimit,
    atLimit: count >= clientLimit,
  };
}

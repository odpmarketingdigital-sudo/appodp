import { prisma } from "@/lib/prisma";

/** Quantidade máxima de clientes ativos no plano gratuito. */
export const FREE_PLAN_CLIENT_LIMIT = 1;

/** Status que liberam recursos premium (assinatura paga e em dia). */
export function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active";
}

/** Plano atual de uma empresa, derivado do status da assinatura. */
export async function getCompanyPlan(
  companyId: string,
): Promise<{ isPremium: boolean; status: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    select: { status: true },
  });
  const status = subscription?.status ?? "free";
  return { isPremium: isActiveStatus(status), status };
}

export type ClientLimitState = {
  isPremium: boolean;
  count: number;
  /** Limite de clientes; `null` significa ilimitado (Premium). */
  limit: number | null;
  atLimit: boolean;
};

/**
 * Estado do limite de clientes da empresa. No plano gratuito conta os clientes
 * ativos e compara com `FREE_PLAN_CLIENT_LIMIT`; no Premium é ilimitado.
 */
export async function getClientLimitState(
  companyId: string,
): Promise<ClientLimitState> {
  const { isPremium } = await getCompanyPlan(companyId);

  if (isPremium) {
    return { isPremium: true, count: 0, limit: null, atLimit: false };
  }

  const count = await prisma.client.count({
    where: { companyId, isActive: true },
  });

  return {
    isPremium: false,
    count,
    limit: FREE_PLAN_CLIENT_LIMIT,
    atLimit: count >= FREE_PLAN_CLIENT_LIMIT,
  };
}

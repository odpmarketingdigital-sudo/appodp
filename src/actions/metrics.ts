"use server";

import { revalidatePath } from "next/cache";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { IntegrationFactory } from "@/lib/integrations/factory";
import {
  DEFAULT_RANGE_DAYS,
  isSyncableProvider,
  lastNDaysRange,
  persistMetricSeries,
  toCredentials,
  type SyncableProvider,
} from "@/lib/integrations/sync-engine";
import { prisma } from "@/lib/prisma";

export type SyncMetricsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function parseProvider(
  value: FormDataEntryValue | null,
): SyncableProvider | null {
  return isSyncableProvider(value) ? value : null;
}

const PROVIDER_LABELS: Record<SyncableProvider, string> = {
  [IntegrationProvider.GA4]: "GA4",
  [IntegrationProvider.GOOGLE_ADS]: "Google Ads",
  [IntegrationProvider.META_ADS]: "Meta Ads",
  [IntegrationProvider.RD_STATION]: "RD Station",
};

/**
 * Coleta o relatório do provedor (via integração), normaliza-o e persiste a
 * série diária em `MarketingMetricHistory` com upsert por (cliente, provedor,
 * data). Protegida por sessão e isolamento multi-tenant.
 */
export async function syncClientMetricsAction(
  _prevState: SyncMetricsState,
  formData: FormData,
): Promise<SyncMetricsState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) {
    return { status: "error", message: "Cliente inválido." };
  }

  const provider = parseProvider(formData.get("provider"));
  if (!provider) {
    return { status: "error", message: "Provedor inválido ou não suportado." };
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return { status: "error", message: "Nenhuma empresa associada ao usuário." };
  }

  // Isolamento multi-tenant: o cliente precisa pertencer à empresa do usuário.
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: membership.company.id },
    select: { id: true },
  });
  if (!client) {
    return { status: "error", message: "Você não tem acesso a este cliente." };
  }

  const label = PROVIDER_LABELS[provider];

  const token = await prisma.integrationToken.findUnique({
    where: { clientId_provider: { clientId, provider } },
  });
  if (!token || !token.isActive) {
    return {
      status: "error",
      message: `Conecte a integração do ${label} antes de sincronizar.`,
    };
  }

  const integration = IntegrationFactory.getProvider(
    provider,
    toCredentials(token),
  );

  const report = await integration.fetchReport({
    range: lastNDaysRange(DEFAULT_RANGE_DAYS),
  });
  if (!report.ok) {
    return { status: "error", message: report.error.message };
  }

  try {
    await persistMetricSeries(clientId, provider, report.data.series);
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar as métricas. Tente novamente.",
    };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath(`/dashboard/clients/${clientId}/integrations`);

  return {
    status: "success",
    message: `${label}: ${report.data.series.length} dias sincronizados.`,
  };
}

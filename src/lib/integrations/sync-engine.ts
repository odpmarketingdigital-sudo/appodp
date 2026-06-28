import {
  IntegrationProvider,
  type IntegrationToken,
} from "@/app/generated/prisma";
import type { IntegrationCredentials } from "@/lib/integrations/base";
import { IntegrationFactory } from "@/lib/integrations/factory";
import { prisma } from "@/lib/prisma";
import type { DateRange, MetricsDataPoint } from "@/types/integrations";

/** Janela padrão de coleta (em dias). */
export const DEFAULT_RANGE_DAYS = 30;

/** Quantos tokens são processados simultaneamente por lote. */
const BATCH_SIZE = 5;

/** Provedores com integração real implementada (coleta habilitada). */
export const SYNCABLE_PROVIDERS = [
  IntegrationProvider.GA4,
  IntegrationProvider.META_ADS,
  IntegrationProvider.RD_STATION,
] as const;

export type SyncableProvider = (typeof SYNCABLE_PROVIDERS)[number];

export function isSyncableProvider(
  value: unknown,
): value is SyncableProvider {
  return SYNCABLE_PROVIDERS.some((provider) => provider === value);
}

/** Resultado da sincronização de um único token. */
export type TokenSyncResult = {
  tokenId: string;
  clientId: string;
  provider: IntegrationProvider;
  ok: boolean;
  /** Dias persistidos quando bem-sucedido. */
  days?: number;
  /** Mensagem de erro quando falha. */
  error?: string;
};

/** Relatório agregado de uma execução global. */
export type GlobalSyncReport = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  total: number;
  succeeded: number;
  failed: number;
  results: TokenSyncResult[];
};

/**
 * Sincroniza todos os tokens de integração ativos cujos provedores possuem
 * coleta implementada. O processamento é feito em lotes e cada token é isolado
 * em seu próprio try/catch — a falha de um cliente nunca interrompe os demais.
 */
export async function runGlobalSync(): Promise<GlobalSyncReport> {
  const startedAt = new Date();

  const tokens = await prisma.integrationToken.findMany({
    where: {
      isActive: true,
      provider: { in: [...SYNCABLE_PROVIDERS] },
    },
  });

  const range = lastNDaysRange(DEFAULT_RANGE_DAYS);
  const results: TokenSyncResult[] = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const settled = await Promise.all(
      batch.map((token) => syncToken(token, range)),
    );
    results.push(...settled);
  }

  const finishedAt = new Date();
  const succeeded = results.filter((result) => result.ok).length;

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}

/** Coleta e persiste o relatório de um único token, sem lançar exceções. */
async function syncToken(
  token: IntegrationToken,
  range: DateRange,
): Promise<TokenSyncResult> {
  const base = {
    tokenId: token.id,
    clientId: token.clientId,
    provider: token.provider,
  };

  try {
    const integration = IntegrationFactory.getProvider(
      token.provider,
      toCredentials(token),
    );

    const report = await integration.fetchReport({ range });
    if (!report.ok) {
      return { ...base, ok: false, error: report.error.message };
    }

    await persistMetricSeries(token.clientId, token.provider, report.data.series);

    return { ...base, ok: true, days: report.data.series.length };
  } catch (error) {
    return {
      ...base,
      ok: false,
      error: error instanceof Error ? error.message : "Erro desconhecido.",
    };
  }
}

/** Converte um `IntegrationToken` persistido em credenciais de integração. */
export function toCredentials(token: IntegrationToken): IntegrationCredentials {
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: token.expiresAt,
    externalAccountId: token.externalAccountId,
    scope: token.scope,
  };
}

/**
 * Faz o upsert (idempotente) da série diária em `MarketingMetricHistory`,
 * usando a chave composta (cliente, provedor, data).
 */
export async function persistMetricSeries(
  clientId: string,
  provider: IntegrationProvider,
  series: MetricsDataPoint[],
): Promise<void> {
  await prisma.$transaction(
    series.map((point) => {
      const date = new Date(`${point.date}T00:00:00.000Z`);
      return prisma.marketingMetricHistory.upsert({
        where: { clientId_provider_date: { clientId, provider, date } },
        create: {
          clientId,
          provider,
          date,
          impressions: point.impressions,
          clicks: point.clicks,
          cost: point.cost,
          conversions: point.conversions,
          revenue: point.revenue,
        },
        update: {
          impressions: point.impressions,
          clicks: point.clicks,
          cost: point.cost,
          conversions: point.conversions,
          revenue: point.revenue,
        },
      });
    }),
  );
}

/** Intervalo ISO (`YYYY-MM-DD`) dos últimos N dias, inclusivo, em UTC. */
export function lastNDaysRange(days: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

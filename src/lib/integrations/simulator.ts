import type { IntegrationProvider } from "@/app/generated/prisma";
import type { DateRange } from "@/types/integrations";
import type {
  IntegrationResult,
  MarketingMetrics,
  MarketingReport,
  MetricsDataPoint,
} from "@/types/integrations";

/**
 * Perfil de simulação que define as faixas plausíveis de cada métrica para um
 * provedor. Mudar o `salt` garante que provedores diferentes gerem séries
 * distintas mesmo para a mesma conta/data.
 */
export type SimulationProfile = {
  salt: string;
  impressions: { min: number; span: number };
  ctr: { min: number; span: number };
  cpc: { min: number; span: number };
  conversionRate: { min: number; span: number };
  averageOrderValue: { min: number; span: number };
  /** Multiplicador de tráfego aplicado em sábados e domingos. */
  weekendFactor: number;
};

const DEFAULT_CURRENCY = "BRL";

/**
 * Monta um `MarketingReport` simulado, porém realista e determinístico, para o
 * intervalo informado. Reaproveitado por todas as integrações "fake" enquanto
 * as APIs reais não são plugadas.
 */
export function buildSimulatedReport(
  provider: IntegrationProvider,
  range: DateRange,
  seedBase: string,
  profile: SimulationProfile,
  currency: string = DEFAULT_CURRENCY,
): IntegrationResult<MarketingReport> {
  const dates = enumerateDates(range.start, range.end);
  if (dates.length === 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Intervalo de datas inválido.",
        retryable: false,
      },
    };
  }

  const series = dates.map((date) => buildDailyPoint(date, seedBase, profile));

  return {
    ok: true,
    data: {
      provider,
      range,
      currency,
      totals: aggregate(series),
      series,
      fetchedAt: new Date().toISOString(),
    },
  };
}

function enumerateDates(start: string, end: string): string[] {
  const result: string[] = [];
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate > endDate
  ) {
    return result;
  }

  for (
    const cursor = new Date(startDate);
    cursor <= endDate;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    result.push(cursor.toISOString().slice(0, 10));
  }

  return result;
}

function buildDailyPoint(
  date: string,
  seedBase: string,
  profile: SimulationProfile,
): MetricsDataPoint {
  const rng = mulberry32(hashString(`${profile.salt}:${seedBase}:${date}`));
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  // Sábado (6) e domingo (0) recebem o fator de fim de semana do provedor.
  const weekendFactor =
    weekday === 0 || weekday === 6 ? profile.weekendFactor : 1;

  const impressions = Math.round(
    (profile.impressions.min + rng() * profile.impressions.span) *
      weekendFactor *
      (0.85 + rng() * 0.3),
  );

  const ctr = profile.ctr.min + rng() * profile.ctr.span;
  const clicks = Math.max(1, Math.round(impressions * ctr));

  const cpc = profile.cpc.min + rng() * profile.cpc.span;
  const cost = round2(clicks * cpc);

  const conversionRate =
    profile.conversionRate.min + rng() * profile.conversionRate.span;
  const conversions = Math.max(0, Math.round(clicks * conversionRate));

  const averageOrderValue =
    profile.averageOrderValue.min + rng() * profile.averageOrderValue.span;
  const revenue = round2(conversions * averageOrderValue);

  return { date, impressions, clicks, cost, conversions, revenue };
}

function aggregate(series: MetricsDataPoint[]): MarketingReport["totals"] {
  const totals = series.reduce<MarketingMetrics>(
    (acc, point) => ({
      impressions: acc.impressions + point.impressions,
      clicks: acc.clicks + point.clicks,
      cost: acc.cost + point.cost,
      conversions: acc.conversions + point.conversions,
      revenue: acc.revenue + point.revenue,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0 },
  );

  const cost = round2(totals.cost);
  const revenue = round2(totals.revenue);

  return {
    ...totals,
    cost,
    revenue,
    ctr: totals.impressions ? round4(totals.clicks / totals.impressions) : 0,
    cpc: totals.clicks ? round2(cost / totals.clicks) : 0,
    cpa: totals.conversions ? round2(cost / totals.conversions) : 0,
    roas: cost ? round2(revenue / cost) : 0,
  };
}

/** Hash FNV-1a (32 bits) para derivar uma semente numérica de uma string. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** PRNG determinístico (mulberry32). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

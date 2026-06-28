import type { IntegrationProvider } from "@/app/generated/prisma";

/** Intervalo de datas no formato ISO `YYYY-MM-DD`. */
export type DateRange = {
  start: string;
  end: string;
};

/**
 * Métricas de marketing normalizadas, comuns a todos os provedores.
 * Cada integração deve mapear seus dados brutos para este formato.
 */
export type MarketingMetrics = {
  impressions: number;
  clicks: number;
  /** Custo total no período, na moeda da conta. */
  cost: number;
  conversions: number;
  /** Receita atribuída (quando disponível). */
  revenue: number;
};

/** Métricas derivadas, calculadas a partir das métricas base. */
export type DerivedMetrics = {
  /** Click-through rate: clicks / impressions. */
  ctr: number;
  /** Custo por clique: cost / clicks. */
  cpc: number;
  /** Custo por aquisição: cost / conversions. */
  cpa: number;
  /** Retorno sobre investimento em anúncios: revenue / cost. */
  roas: number;
};

/** Ponto de uma série temporal (métricas de um dia específico). */
export type MetricsDataPoint = MarketingMetrics & {
  /** Data do ponto no formato ISO `YYYY-MM-DD`. */
  date: string;
};

/** Relatório de marketing padronizado retornado por uma integração. */
export type MarketingReport = {
  provider: IntegrationProvider;
  range: DateRange;
  /** Código de moeda ISO 4217 (ex.: "BRL", "USD"). */
  currency: string;
  /** Totais agregados do período, com métricas derivadas opcionais. */
  totals: MarketingMetrics & Partial<DerivedMetrics>;
  /** Série temporal diária. */
  series: MetricsDataPoint[];
  /** Momento da coleta (ISO timestamp). */
  fetchedAt: string;
};

/** Códigos de erro normalizados entre provedores. */
export type IntegrationErrorCode =
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "PROVIDER_ERROR"
  | "UNKNOWN";

/** Erro normalizado de integração. */
export type IntegrationError = {
  code: IntegrationErrorCode;
  message: string;
  /** Indica se a operação pode ser repetida (ex.: rate limit). */
  retryable: boolean;
};

/**
 * Resultado seguro (discriminated union) para chamadas de integração,
 * evitando exceções não tratadas no fluxo do SaaS.
 */
export type IntegrationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: IntegrationError };

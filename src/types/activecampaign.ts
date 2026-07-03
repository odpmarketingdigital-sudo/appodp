import type { DateRange } from "@/types/integrations";

export type DealMetricsKpis = {
  totalCount: number;
  totalValue: number;
  winCount: number;
  loseCount: number;
  ticketMedio: number;
};

export type DealMetricsBreakdownRow = {
  name: string;
  count: number;
  value: number;
};

/** Relatório consolidado de negócios do ActiveCampaign. */
export type DealMetricsReport = {
  range: DateRange;
  kpis: DealMetricsKpis;
  stages: DealMetricsBreakdownRow[];
  owners: DealMetricsBreakdownRow[];
  fetchedAt: string;
  /** Indica se a paginação atingiu o limite de segurança. */
  truncated: boolean;
  /** Período selecionado excede 31 dias (limite de performance). */
  longPeriod: boolean;
};

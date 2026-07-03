import type { DateRange } from "@/types/integrations";

/** Funil (pipeline) retornado pela API do ActiveCampaign. */
export type AcPipelineOption = {
  id: string;
  title: string;
};

/** Metadados persistidos no token de integração ActiveCampaign. */
export type ActiveCampaignTokenMetadata = {
  pipelineId?: string;
};

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

export type DealMetricsOwnerStageRow = {
  name: string;
  count: number;
};

export type DealMetricsOwnerRow = {
  name: string;
  count: number;
  value: number;
  stages: DealMetricsOwnerStageRow[];
};

/** Relatório consolidado de negócios do ActiveCampaign. */
export type DealMetricsReport = {
  range: DateRange;
  kpis: DealMetricsKpis;
  stages: DealMetricsBreakdownRow[];
  owners: DealMetricsOwnerRow[];
  fetchedAt: string;
  /** Indica se a paginação atingiu o limite de segurança. */
  truncated: boolean;
  /** Período selecionado excede 31 dias (limite de performance). */
  longPeriod: boolean;
};

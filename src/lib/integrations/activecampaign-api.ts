import { unstable_cache } from "next/cache";

import { isSixtyDayRange } from "@/lib/date-ranges";
import type {
  AcPipelineOption,
  DealMetricsBreakdownRow,
  DealMetricsOwnerRow,
  DealMetricsReport,
} from "@/types/activecampaign";
import type { DateRange } from "@/types/integrations";

const PAGE_SIZE = 100;
const PACING_DELAY_MS = 50;
const CACHE_REVALIDATE_SECONDS = 300;

/** Campos mínimos extraídos de cada deal para agregação. */
type DealAggregateFields = {
  stage?: string;
  owner?: string;
  value?: string;
  status?: string;
};

type ActiveCampaignDeal = {
  id: string;
  title?: string;
  value?: string;
  status?: string;
  stage?: string;
  owner?: string;
  cdate?: string;
  isDisabled?: boolean | number;
};

type DealsListResponse = {
  deals?: ActiveCampaignDeal[];
  meta?: { total?: number | string };
};

type DealStage = {
  id: string;
  title?: string;
};

type DealStagesResponse = {
  dealStages?: DealStage[];
};

type AcUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
};

type UsersResponse = {
  users?: AcUser[];
};

type DealGroupsResponse = {
  dealGroups?: Array<{ id: string; title?: string }>;
};

function normalizeApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api/3")) {
    return trimmed;
  }
  return `${trimmed}/api/3`;
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Valores de deal vêm em centavos; converte para unidade monetária. */
function parseDealValue(value: string | undefined): number {
  return toNumber(value) / 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slimDeal(deal: ActiveCampaignDeal): DealAggregateFields | null {
  if (deal.isDisabled) {
    return null;
  }

  return {
    stage: deal.stage,
    owner: deal.owner,
    value: deal.value,
    status: deal.status,
  };
}

function buildDealsQuery(
  range: DateRange,
  offset: number,
  pipelineId?: string,
): string {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(offset));
  params.set("orders[cdate]", "DESC");
  params.set("filters[cdate_greater_than]", range.start);
  params.set("filters[cdate_less_than]", range.end);

  if (pipelineId) {
    params.set("filters[pipeline]", pipelineId);
  }

  return params.toString();
}

/** Lista todos os funis (pipelines) da conta ActiveCampaign. */
export async function listPipelines(
  apiBaseUrl: string,
  apiToken: string,
): Promise<AcPipelineOption[]> {
  const response = await acFetch<DealGroupsResponse>(
    apiBaseUrl,
    apiToken,
    "/dealGroups?limit=100&filters[have_stages]=1",
  );

  return (response.dealGroups ?? [])
    .map((pipeline) => ({
      id: pipeline.id,
      title: pipeline.title?.trim() || `Funil ${pipeline.id}`,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

async function acFetch<T>(
  apiBaseUrl: string,
  apiToken: string,
  path: string,
  revalidate = CACHE_REVALIDATE_SECONDS,
): Promise<T> {
  const base = normalizeApiBaseUrl(apiBaseUrl);
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    headers: {
      "Api-Token": apiToken,
      Accept: "application/json",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `ActiveCampaign API ${response.status}: ${body.slice(0, 200) || response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

async function fetchDealsPage(
  apiBaseUrl: string,
  apiToken: string,
  range: DateRange,
  offset: number,
  pipelineId?: string,
): Promise<DealsListResponse> {
  const query = buildDealsQuery(range, offset, pipelineId);
  return acFetch<DealsListResponse>(
    apiBaseUrl,
    apiToken,
    `/deals?${query}`,
    0,
  );
}

async function fetchAllDealsInRange(
  apiBaseUrl: string,
  apiToken: string,
  range: DateRange,
  pipelineId?: string,
): Promise<DealAggregateFields[]> {
  const deals: DealAggregateFields[] = [];
  let offset = 0;
  const usePacing = isSixtyDayRange(range);

  while (true) {
    const response = await fetchDealsPage(
      apiBaseUrl,
      apiToken,
      range,
      offset,
      pipelineId,
    );
    const batch = response.deals ?? [];

    for (const deal of batch) {
      const slim = slimDeal(deal);
      if (slim) {
        deals.push(slim);
      }
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;

    if (usePacing) {
      await sleep(PACING_DELAY_MS);
    }
  }

  return deals;
}

async function fetchMetadataMaps(
  apiBaseUrl: string,
  apiToken: string,
): Promise<{ stageMap: Map<string, string>; ownerMap: Map<string, string> }> {
  const [stageMap, ownerMap] = await Promise.all([
    fetchStageMap(apiBaseUrl, apiToken),
    fetchOwnerMap(apiBaseUrl, apiToken),
  ]);
  return { stageMap, ownerMap };
}

async function fetchStageMap(
  apiBaseUrl: string,
  apiToken: string,
): Promise<Map<string, string>> {
  const response = await acFetch<DealStagesResponse>(
    apiBaseUrl,
    apiToken,
    "/dealStages?limit=100",
  );

  const map = new Map<string, string>();
  for (const stage of response.dealStages ?? []) {
    map.set(stage.id, stage.title?.trim() || `Estágio ${stage.id}`);
  }
  return map;
}

async function fetchOwnerMap(
  apiBaseUrl: string,
  apiToken: string,
): Promise<Map<string, string>> {
  const response = await acFetch<UsersResponse>(
    apiBaseUrl,
    apiToken,
    "/users?limit=100",
  );

  const map = new Map<string, string>();
  for (const user of response.users ?? []) {
    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    map.set(
      user.id,
      fullName || user.username?.trim() || `Vendedor ${user.id}`,
    );
  }
  return map;
}

function aggregateBreakdown(
  deals: DealAggregateFields[],
  resolveName: (deal: DealAggregateFields) => string,
): DealMetricsBreakdownRow[] {
  const map = new Map<string, { count: number; value: number }>();

  for (const deal of deals) {
    const name = resolveName(deal);
    const value = parseDealValue(deal.value);
    const existing = map.get(name) ?? { count: 0, value: 0 };
    map.set(name, {
      count: existing.count + 1,
      value: existing.value + value,
    });
  }

  return [...map.entries()]
    .map(([name, { count, value }]) => ({ name, count, value }))
    .sort((a, b) => b.value - a.value);
}

function aggregateOwnersWithStages(
  deals: DealAggregateFields[],
  stageMap: Map<string, string>,
  ownerMap: Map<string, string>,
): DealMetricsOwnerRow[] {
  const map = new Map<
    string,
    { count: number; value: number; stages: Map<string, number> }
  >();

  for (const deal of deals) {
    const ownerId = deal.owner ?? "unknown";
    const ownerName = ownerMap.get(ownerId) ?? `Vendedor ${ownerId}`;
    const stageId = deal.stage ?? "unknown";
    const stageName = stageMap.get(stageId) ?? `Estágio ${stageId}`;
    const dealValue = parseDealValue(deal.value);

    const existing = map.get(ownerName) ?? {
      count: 0,
      value: 0,
      stages: new Map<string, number>(),
    };

    existing.count += 1;
    existing.value += dealValue;
    existing.stages.set(stageName, (existing.stages.get(stageName) ?? 0) + 1);
    map.set(ownerName, existing);
  }

  return [...map.entries()]
    .map(([name, { count, value, stages }]) => ({
      name,
      count,
      value,
      stages: [...stages.entries()]
        .map(([stageName, stageCount]) => ({ name: stageName, count: stageCount }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
}

function aggregateKpis(deals: DealAggregateFields[]) {
  let totalValue = 0;
  let winCount = 0;
  let loseCount = 0;

  for (const deal of deals) {
    totalValue += parseDealValue(deal.value);
    if (deal.status === "1") winCount += 1;
    if (deal.status === "2") loseCount += 1;
  }

  const totalCount = deals.length;
  const ticketMedio = totalCount > 0 ? totalValue / totalCount : 0;

  return { totalCount, totalValue, winCount, loseCount, ticketMedio };
}

async function computeDealMetrics(
  apiBaseUrl: string,
  apiToken: string,
  range: DateRange,
  pipelineId?: string,
): Promise<DealMetricsReport> {
  const [{ stageMap, ownerMap }, deals] = await Promise.all([
    fetchMetadataMaps(apiBaseUrl, apiToken),
    fetchAllDealsInRange(apiBaseUrl, apiToken, range, pipelineId),
  ]);

  return {
    range,
    kpis: aggregateKpis(deals),
    stages: aggregateBreakdown(deals, (deal) => {
      const stageId = deal.stage ?? "unknown";
      return stageMap.get(stageId) ?? `Estágio ${stageId}`;
    }),
    owners: aggregateOwnersWithStages(deals, stageMap, ownerMap),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Busca negócios do ActiveCampaign com filtros nativos de data, paginação
 * completa e agregação em memória antes de retornar ao front-end.
 */
export async function getDealMetrics(
  apiBaseUrl: string,
  apiToken: string,
  range: DateRange,
  pipelineId?: string,
): Promise<DealMetricsReport> {
  const cached = unstable_cache(
    () => computeDealMetrics(apiBaseUrl, apiToken, range, pipelineId),
    [
      "ac-deal-metrics",
      normalizeApiBaseUrl(apiBaseUrl),
      range.start,
      range.end,
      pipelineId ?? "all",
    ],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cached();
}

import { addDays, format, parseISO } from "date-fns";
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
  stageId: string;
  ownerId: string;
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

function normalizeId(id: string | number | undefined | null): string {
  if (id === undefined || id === null || String(id).trim() === "") {
    return "unknown";
  }
  return String(id).trim();
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

/** created_before é exclusivo; avança 1 dia para incluir o endDate. */
function exclusiveEndDate(endDate: string): string {
  return format(addDays(parseISO(endDate), 1), "yyyy-MM-dd");
}

function slimDeal(deal: ActiveCampaignDeal): DealAggregateFields | null {
  if (deal.isDisabled) {
    return null;
  }

  return {
    stageId: normalizeId(deal.stage),
    ownerId: normalizeId(deal.owner),
    value: deal.value,
    status: deal.status,
  };
}

function resolveStageName(
  stageMap: Map<string, string>,
  stageId: string,
): string {
  return stageMap.get(stageId) ?? `Estágio ${stageId}`;
}

function resolveOwnerName(
  ownerMap: Map<string, string>,
  ownerId: string,
): string {
  return ownerMap.get(ownerId) ?? `Vendedor ${ownerId}`;
}

function buildDealsQuery(
  startDate: string,
  endDate: string,
  offset: number,
  pipelineId?: string,
): string {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(offset));
  params.set("orders[cdate]", "DESC");
  // Filtros nativos documentados pelo ActiveCampaign para deals.
  params.set("filters[created_after]", startDate);
  params.set("filters[created_before]", exclusiveEndDate(endDate));

  if (pipelineId) {
    params.set("filters[group]", pipelineId);
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
  options: { revalidate?: number; noStore?: boolean } = {},
): Promise<T> {
  const base = normalizeApiBaseUrl(apiBaseUrl);
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const { revalidate = CACHE_REVALIDATE_SECONDS, noStore = false } = options;

  const response = await fetch(url, {
    headers: {
      "Api-Token": apiToken,
      Accept: "application/json",
    },
    ...(noStore
      ? { cache: "no-store" as const }
      : { next: { revalidate } }),
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
  startDate: string,
  endDate: string,
  offset: number,
  pipelineId?: string,
): Promise<DealsListResponse> {
  const query = buildDealsQuery(startDate, endDate, offset, pipelineId);
  return acFetch<DealsListResponse>(
    apiBaseUrl,
    apiToken,
    `/deals?${query}`,
    { noStore: true },
  );
}

async function fetchAllDealsInRange(
  apiBaseUrl: string,
  apiToken: string,
  startDate: string,
  endDate: string,
  pipelineId?: string,
): Promise<DealAggregateFields[]> {
  const deals: DealAggregateFields[] = [];
  let offset = 0;
  const usePacing = isSixtyDayRange({ start: startDate, end: endDate });

  while (true) {
    const response = await fetchDealsPage(
      apiBaseUrl,
      apiToken,
      startDate,
      endDate,
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
  pipelineId?: string,
): Promise<{ stageMap: Map<string, string>; ownerMap: Map<string, string> }> {
  const [stageMap, ownerMap] = await Promise.all([
    fetchStageMap(apiBaseUrl, apiToken, pipelineId),
    fetchOwnerMap(apiBaseUrl, apiToken),
  ]);
  return { stageMap, ownerMap };
}

async function fetchStageMap(
  apiBaseUrl: string,
  apiToken: string,
  pipelineId?: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let offset = 0;

  while (true) {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));

    if (pipelineId) {
      params.set("filters[d_groupid]", pipelineId);
    }

    const response = await acFetch<DealStagesResponse>(
      apiBaseUrl,
      apiToken,
      `/dealStages?${params.toString()}`,
      { noStore: true },
    );

    const batch = response.dealStages ?? [];
    for (const stage of batch) {
      const id = normalizeId(stage.id);
      map.set(id, stage.title?.trim() || `Estágio ${id}`);
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
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
    const id = normalizeId(user.id);
    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    map.set(
      id,
      fullName || user.username?.trim() || `Vendedor ${id}`,
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
    const ownerName = resolveOwnerName(ownerMap, deal.ownerId);
    const stageName = resolveStageName(stageMap, deal.stageId);
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
  startDate: string,
  endDate: string,
  pipelineId?: string,
): Promise<DealMetricsReport> {
  const range: DateRange = { start: startDate, end: endDate };

  const [{ stageMap, ownerMap }, deals] = await Promise.all([
    fetchMetadataMaps(apiBaseUrl, apiToken, pipelineId),
    fetchAllDealsInRange(apiBaseUrl, apiToken, startDate, endDate, pipelineId),
  ]);

  return {
    range,
    kpis: aggregateKpis(deals),
    stages: aggregateBreakdown(deals, (deal) =>
      resolveStageName(stageMap, deal.stageId),
    ),
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
  const startDate = range.start;
  const endDate = range.end;

  const cached = unstable_cache(
    () =>
      computeDealMetrics(
        apiBaseUrl,
        apiToken,
        startDate,
        endDate,
        pipelineId,
      ),
    [
      "ac-deal-metrics",
      normalizeApiBaseUrl(apiBaseUrl),
      startDate,
      endDate,
      pipelineId ?? "all",
    ],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cached();
}

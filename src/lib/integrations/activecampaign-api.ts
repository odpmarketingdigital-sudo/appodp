import { differenceInCalendarDays, parseISO } from "date-fns";
import { unstable_cache } from "next/cache";

import type {
  DealMetricsBreakdownRow,
  DealMetricsReport,
} from "@/types/activecampaign";
import type { DateRange } from "@/types/integrations";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const LONG_PERIOD_DAYS = 31;
const CACHE_REVALIDATE_SECONDS = 300;

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

/** Dias inclusivos entre start e end (YYYY-MM-DD). */
export function rangeSpanDays(range: DateRange): number {
  return differenceInCalendarDays(parseISO(range.end), parseISO(range.start)) + 1;
}

function buildDealsQuery(range: DateRange, offset: number): string {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(offset));
  params.set("orders[cdate]", "DESC");
  params.set("filters[cdate_greater_than]", range.start);
  params.set("filters[cdate_less_than]", range.end);

  return params.toString();
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
): Promise<DealsListResponse> {
  const query = buildDealsQuery(range, offset);
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
  maxPages: number,
): Promise<{ deals: ActiveCampaignDeal[]; truncated: boolean }> {
  const deals: ActiveCampaignDeal[] = [];
  let offset = 0;
  let truncated = false;

  for (let page = 0; page < maxPages; page += 1) {
    const response = await fetchDealsPage(apiBaseUrl, apiToken, range, offset);
    const batch = response.deals ?? [];
    deals.push(...batch.filter((deal) => !deal.isDisabled));

    const total = toNumber(String(response.meta?.total ?? 0));
    offset += PAGE_SIZE;

    if (batch.length < PAGE_SIZE) {
      break;
    }

    if (total > 0 && offset >= total) {
      break;
    }

    if (page === maxPages - 1 && batch.length === PAGE_SIZE) {
      truncated = true;
    }
  }

  return { deals, truncated };
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
  deals: ActiveCampaignDeal[],
  resolveName: (deal: ActiveCampaignDeal) => string,
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

function aggregateKpis(deals: ActiveCampaignDeal[]) {
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
): Promise<DealMetricsReport> {
  const isLongPeriod = rangeSpanDays(range) > LONG_PERIOD_DAYS;
  // Períodos > 31 dias ficam limitados a MAX_PAGES para evitar timeout na Vercel.
  const maxPages = MAX_PAGES;

  const [{ deals, truncated }, { stageMap, ownerMap }] = await Promise.all([
    fetchAllDealsInRange(apiBaseUrl, apiToken, range, maxPages),
    fetchMetadataMaps(apiBaseUrl, apiToken),
  ]);

  return {
    range,
    kpis: aggregateKpis(deals),
    stages: aggregateBreakdown(deals, (deal) => {
      const stageId = deal.stage ?? "unknown";
      return stageMap.get(stageId) ?? `Estágio ${stageId}`;
    }),
    owners: aggregateBreakdown(deals, (deal) => {
      const ownerId = deal.owner ?? "unknown";
      return ownerMap.get(ownerId) ?? `Vendedor ${ownerId}`;
    }),
    fetchedAt: new Date().toISOString(),
    truncated,
    longPeriod: isLongPeriod,
  };
}

/**
 * Busca negócios do ActiveCampaign com filtros nativos de data, paginação
 * controlada e agregação em memória antes de retornar ao front-end.
 */
export async function getDealMetrics(
  apiBaseUrl: string,
  apiToken: string,
  range: DateRange,
): Promise<DealMetricsReport> {
  const cached = unstable_cache(
    () => computeDealMetrics(apiBaseUrl, apiToken, range),
    [
      "ac-deal-metrics",
      normalizeApiBaseUrl(apiBaseUrl),
      range.start,
      range.end,
    ],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cached();
}

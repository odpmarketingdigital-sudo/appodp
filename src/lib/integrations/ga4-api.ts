import type { DateRange } from "@/types/integrations";
import type {
  GA4BreakdownRow,
  GA4DashboardReport,
  GA4PropertyOption,
  GA4TimelinePoint,
} from "@/types/ga4";

const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

type AdminListResponse = {
  accountSummaries?: Array<{
    displayName?: string;
    propertySummaries?: Array<{
      property?: string;
      displayName?: string;
    }>;
  }>;
};

type DataApiRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

type DataApiResponse = {
  rows?: DataApiRow[];
  totals?: DataApiRow[];
};

function normalizePropertyId(propertyId: string): string {
  return propertyId.replace(/^properties\//, "");
}

function propertyResource(propertyId: string): string {
  const id = normalizePropertyId(propertyId);
  return `properties/${id}`;
}

function parseGa4Date(value: string): string {
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMetrics(row: DataApiRow): {
  activeUsers: number;
  engagedSessions: number;
  eventCount: number;
} {
  return {
    activeUsers: toNumber(row.metricValues?.[0]?.value),
    engagedSessions: toNumber(row.metricValues?.[1]?.value),
    eventCount: toNumber(row.metricValues?.[2]?.value),
  };
}

async function runGa4Report(
  accessToken: string,
  propertyId: string,
  range: DateRange,
  dimensions: string[],
  limit = 10,
): Promise<DataApiResponse> {
  const response = await fetch(
    `${DATA_API}/${propertyResource(propertyId)}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: range.start, endDate: range.end }],
        dimensions: dimensions.map((name) => ({ name })),
        metrics: [
          { name: "activeUsers" },
          { name: "engagedSessions" },
          { name: "eventCount" },
        ],
        limit: String(limit),
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GA4 Data API error (${response.status}): ${body}`);
  }

  return (await response.json()) as DataApiResponse;
}

/** Lista propriedades GA4 acessíveis pelo token (Analytics Admin API). */
export async function listGa4Properties(
  accessToken: string,
): Promise<GA4PropertyOption[]> {
  const properties: GA4PropertyOption[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${ADMIN_API}/accountSummaries`);
    url.searchParams.set("pageSize", "200");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GA4 Admin API error (${response.status}): ${body}`);
    }

    const data = (await response.json()) as AdminListResponse & {
      nextPageToken?: string;
    };

    for (const account of data.accountSummaries ?? []) {
      for (const property of account.propertySummaries ?? []) {
        if (!property.property) continue;
        properties.push({
          propertyId: normalizePropertyId(property.property),
          displayName: property.displayName ?? property.property,
          accountName: account.displayName ?? "Conta Google",
        });
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return properties;
}

/** Busca relatório completo do dashboard GA4 para o período informado. */
export async function fetchGa4DashboardReport(
  accessToken: string,
  propertyId: string,
  range: DateRange,
): Promise<GA4DashboardReport> {
  const normalizedId = normalizePropertyId(propertyId);

  const [timelineRes, citiesRes, channelsRes, ageRes] = await Promise.all([
    runGa4Report(accessToken, normalizedId, range, ["date"], 366),
    runGa4Report(accessToken, normalizedId, range, ["city"], 10),
    runGa4Report(accessToken, normalizedId, range, ["sessionSourceMedium"], 10),
    runGa4Report(accessToken, normalizedId, range, ["userAgeBracket"], 10),
  ]);

  const timeline: GA4TimelinePoint[] = (timelineRes.rows ?? [])
    .map((row) => {
      const rawDate = row.dimensionValues?.[0]?.value ?? "";
      const metrics = parseMetrics(row);
      return {
        date: parseGa4Date(rawDate),
        ...metrics,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const mapBreakdown = (
    rows: DataApiRow[],
    labelIndex = 0,
  ): GA4BreakdownRow[] =>
    rows.map((row) => ({
      label: row.dimensionValues?.[labelIndex]?.value ?? "(not set)",
      ...parseMetrics(row),
    }));

  const summaryRow = timelineRes.totals?.[0];
  const summary = summaryRow
    ? parseMetrics(summaryRow)
    : timeline.reduce(
        (acc, point) => ({
          activeUsers: acc.activeUsers + point.activeUsers,
          engagedSessions: acc.engagedSessions + point.engagedSessions,
          eventCount: acc.eventCount + point.eventCount,
        }),
        { activeUsers: 0, engagedSessions: 0, eventCount: 0 },
      );

  return {
    range,
    propertyId: normalizedId,
    summary,
    timeline,
    cities: mapBreakdown(citiesRes.rows ?? []),
    channels: mapBreakdown(channelsRes.rows ?? []),
    ageBrackets: mapBreakdown(ageRes.rows ?? []),
    fetchedAt: new Date().toISOString(),
  };
}

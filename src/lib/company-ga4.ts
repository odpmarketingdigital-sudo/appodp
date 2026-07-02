import { IntegrationProvider } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getClientGa4Connection } from "@/lib/client-ga4";
import { fetchGa4DashboardReport } from "@/lib/integrations/ga4-api";

import type { GA4BreakdownRow, GA4DashboardReport } from "@/types/ga4";
import type { DateRange } from "@/types/integrations";

function mergeBreakdownRows(rows: GA4BreakdownRow[]): GA4BreakdownRow[] {
  const map = new Map<string, GA4BreakdownRow>();

  for (const row of rows) {
    const existing = map.get(row.label);
    if (existing) {
      map.set(row.label, {
        label: row.label,
        activeUsers: existing.activeUsers + row.activeUsers,
        engagedSessions: existing.engagedSessions + row.engagedSessions,
        eventCount: existing.eventCount + row.eventCount,
      });
    } else {
      map.set(row.label, { ...row });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.activeUsers - a.activeUsers)
    .slice(0, 10);
}

function mergeTimeline(
  reports: GA4DashboardReport[],
): GA4DashboardReport["timeline"] {
  const map = new Map<string, GA4DashboardReport["timeline"][number]>();

  for (const report of reports) {
    for (const point of report.timeline) {
      const existing = map.get(point.date);
      if (existing) {
        map.set(point.date, {
          date: point.date,
          activeUsers: existing.activeUsers + point.activeUsers,
          engagedSessions: existing.engagedSessions + point.engagedSessions,
          eventCount: existing.eventCount + point.eventCount,
        });
      } else {
        map.set(point.date, { ...point });
      }
    }
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Visão macro da agência: agrega métricas GA4 de todos os clientes
 * com propriedade configurada e token ativo.
 */
export async function getCompanyGa4Overview(
  companyId: string,
  range: DateRange,
): Promise<GA4DashboardReport | null> {
  const clients = await prisma.client.findMany({
    where: {
      companyId,
      ga4PropertyId: { not: null },
      integrationTokens: {
        some: { provider: IntegrationProvider.GA4, isActive: true },
      },
    },
    select: { id: true },
  });

  if (clients.length === 0) {
    return null;
  }

  const reports: GA4DashboardReport[] = [];

  for (const { id } of clients) {
    const connection = await getClientGa4Connection(id, companyId);
    if (!connection?.propertyId) continue;

    try {
      const report = await fetchGa4DashboardReport(
        connection.accessToken,
        connection.propertyId,
        range,
      );
      reports.push(report);
    } catch {
      // Ignora falha individual para não bloquear a visão agregada.
    }
  }

  if (reports.length === 0) {
    return null;
  }

  const summary = reports.reduce(
    (acc, report) => ({
      activeUsers: acc.activeUsers + report.summary.activeUsers,
      engagedSessions: acc.engagedSessions + report.summary.engagedSessions,
      eventCount: acc.eventCount + report.summary.eventCount,
    }),
    { activeUsers: 0, engagedSessions: 0, eventCount: 0 },
  );

  return {
    range,
    propertyId: "aggregated",
    summary,
    timeline: mergeTimeline(reports),
    cities: mergeBreakdownRows(reports.flatMap((r) => r.cities)),
    channels: mergeBreakdownRows(reports.flatMap((r) => r.channels)),
    fetchedAt: new Date().toISOString(),
  };
}

/** Indica se a agência tem ao menos um cliente com GA4 conectado. */
export async function companyHasGa4Clients(companyId: string): Promise<boolean> {
  const count = await prisma.client.count({
    where: {
      companyId,
      integrationTokens: {
        some: { provider: IntegrationProvider.GA4, isActive: true },
      },
    },
  });
  return count > 0;
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { BlendedSummary } from "@/components/blended-summary";
import { ClientAnalyticsTabs } from "@/components/client-analytics-tabs";
import { CrmDealMetricsSection } from "@/components/crm-deal-metrics-section";
import {
  type MetricChannel,
  type MetricPoint,
} from "@/components/metrics-chart";
import { getCurrentMembership } from "@/lib/company";
import { getClientActiveCampaignConnection } from "@/lib/client-activecampaign";
import { getClientGa4Connection } from "@/lib/client-ga4";
import {
  parseDateRangePreset,
  resolveDateRangePreset,
} from "@/lib/date-ranges";
import { fetchGa4DashboardReport } from "@/lib/integrations/ga4-api";
import { getMetaInsights } from "@/lib/integrations/meta-api";
import { prisma } from "@/lib/prisma";

import type { GA4DashboardReport } from "@/types/ga4";

const CHART_PROVIDERS = [
  { provider: IntegrationProvider.GA4, label: "GA4" },
  { provider: IntegrationProvider.META_ADS, label: "Meta Ads" },
  { provider: IntegrationProvider.RD_STATION, label: "RD Station" },
] as const;

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    redirect("/dashboard/clients");
  }

  const client = await prisma.client.findFirst({
    where: { id, companyId: membership.company.id },
    include: { integrationTokens: true },
  });

  if (!client) {
    notFound();
  }

  const period = parseDateRangePreset(query.period);
  const range = resolveDateRangePreset(period);
  const clientBasePath = `/dashboard/clients/${client.id}`;
  const integrationsPath = `${clientBasePath}/integrations`;

  const tokensByProvider = new Map(
    client.integrationTokens.map((token) => [token.provider, token]),
  );

  const ga4Token = tokensByProvider.get(IntegrationProvider.GA4);
  const metaToken = tokensByProvider.get(IntegrationProvider.META_ADS);
  const acToken = tokensByProvider.get(IntegrationProvider.ACTIVECAMPAIGN);
  const ga4Connected = Boolean(ga4Token?.isActive);
  const metaConnected = Boolean(metaToken?.isActive);
  const acConnected = Boolean(acToken?.isActive);
  const metaAccountSelected = Boolean(metaToken?.externalAccountId);

  let ga4Report: GA4DashboardReport | null = null;
  let ga4Error: string | null = null;

  const connection = await getClientGa4Connection(
    client.id,
    membership.company.id,
  );

  if (ga4Connected && connection?.propertyId) {
    try {
      ga4Report = await fetchGa4DashboardReport(
        connection.accessToken,
        connection.propertyId,
        range,
      );
    } catch (error) {
      ga4Error =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados do GA4.";
    }
  }

  let metaInsights = null;
  let metaError: string | null = null;

  if (metaConnected && metaAccountSelected) {
    const metaResult = await getMetaInsights(
      client.id,
      membership.company.id,
      range.start,
      range.end,
    );

    if (metaResult.ok) {
      metaInsights = metaResult.data;
    } else {
      metaError = metaResult.error;
    }
  }

  const acConnection = acConnected
    ? await getClientActiveCampaignConnection(
        client.id,
        membership.company.id,
      )
    : null;
  const acPipelineSelected = Boolean(acConnection?.pipelineId);

  const crmMetricsContent =
    acConnection?.pipelineId ? (
      <CrmDealMetricsSection
        apiBaseUrl={acConnection.apiBaseUrl}
        apiToken={acConnection.apiToken}
        range={range}
        pipelineId={acConnection.pipelineId}
      />
    ) : null;

  const metricHistory = await prisma.marketingMetricHistory.findMany({
    where: {
      clientId: client.id,
      provider: { in: CHART_PROVIDERS.map((c) => c.provider) },
    },
    orderBy: { date: "asc" },
  });

  const seriesByProvider = new Map<IntegrationProvider, MetricPoint[]>();
  for (const row of metricHistory) {
    const point: MetricPoint = {
      date: row.date.toISOString().slice(0, 10),
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      conversions: row.conversions,
      revenue: row.revenue,
    };
    const list = seriesByProvider.get(row.provider) ?? [];
    list.push(point);
    seriesByProvider.set(row.provider, list);
  }

  const channels: MetricChannel[] = CHART_PROVIDERS.map(({ provider, label }) => ({
    provider,
    label,
    data: seriesByProvider.get(provider) ?? [],
  }));

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              {client.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {client.email ?? "Sem e-mail"} · Visão detalhada por canal
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <Link
              href={integrationsPath}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
            >
              <Settings className="h-4 w-4" aria-hidden />
              Configurar Integrações
            </Link>
          </div>
        </header>

        <BlendedSummary channels={channels} />

        <ClientAnalyticsTabs
          basePath={clientBasePath}
          integrationsHref={integrationsPath}
          ga4Connected={ga4Connected}
          metaConnected={metaConnected}
          metaAccountSelected={metaAccountSelected}
          acConnected={acConnected}
          acPipelineSelected={acPipelineSelected}
          crmMetricsKey={`${range.start}-${range.end}`}
          crmMetricsContent={crmMetricsContent}
          ga4Report={ga4Report}
          ga4Error={ga4Error}
          metaInsights={metaInsights}
          metaError={metaError}
        />
      </div>
    </main>
  );
}

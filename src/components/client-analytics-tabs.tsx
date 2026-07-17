"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { BarChart3, CircleDollarSign, Megaphone, Users } from "lucide-react";

import { CrmDealMetricsSkeleton } from "@/components/crm-deal-metrics-skeleton";
import { DashboardDateRange } from "@/components/dashboard-date-range";
import { Ga4DashboardCharts } from "@/components/ga4-dashboard-charts";
import { GoogleAdsDashboardSummary } from "@/components/google-ads-dashboard-summary";
import { IntegrationEmptyState } from "@/components/integration-empty-state";
import { MetaDashboardSummary } from "@/components/meta-dashboard-summary";
import type { MetricPoint } from "@/components/metrics-chart";
import type { GA4DashboardReport } from "@/types/ga4";
import type { MetaInsightsSummary } from "@/types/meta";

const TABS = [
  { id: "ga4", label: "Google Analytics 4", icon: BarChart3 },
  { id: "google_ads", label: "Google Ads", icon: CircleDollarSign },
  { id: "meta", label: "Meta Ads", icon: Megaphone },
  { id: "crm", label: "CRM", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ClientAnalyticsTabsProps = {
  basePath: string;
  integrationsHref: string;
  ga4Connected: boolean;
  googleAdsConnected: boolean;
  googleAdsAccountSelected: boolean;
  googleAdsMetrics: MetricPoint[];
  metaConnected: boolean;
  metaAccountSelected: boolean;
  acConnected: boolean;
  acPipelineSelected: boolean;
  crmMetricsKey: string;
  crmMetricsContent: ReactNode | null;
  ga4Report: GA4DashboardReport | null;
  ga4Error: string | null;
  metaInsights: MetaInsightsSummary | null;
  metaError: string | null;
};

export function ClientAnalyticsTabs({
  basePath,
  integrationsHref,
  ga4Connected,
  googleAdsConnected,
  googleAdsAccountSelected,
  googleAdsMetrics,
  metaConnected,
  metaAccountSelected,
  acConnected,
  acPipelineSelected,
  crmMetricsKey,
  crmMetricsContent,
  ga4Report,
  ga4Error,
  metaInsights,
  metaError,
}: ClientAnalyticsTabsProps) {
  const visibleTabs = useMemo(
    () =>
      TABS.filter((tab) => {
        if (tab.id === "google_ads") {
          return googleAdsConnected;
        }
        return true;
      }),
    [googleAdsConnected],
  );

  const [activeTab, setActiveTab] = useState<TabId>("ga4");

  const resolvedActiveTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id ?? "ga4";

  const hasGoogleAdsMetrics = googleAdsMetrics.some(
    (point) =>
      point.impressions > 0 ||
      point.clicks > 0 ||
      point.cost > 0 ||
      point.conversions > 0,
  );

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="inline-flex min-w-max gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1">
            {visibleTabs.map(({ id, label, icon: Icon }) => {
              const isActive = resolvedActiveTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={
                    isActive
                      ? "inline-flex items-center gap-1.5 rounded-full bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-100 sm:gap-2 sm:px-4"
                      : "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200 sm:gap-2 sm:px-4"
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Suspense
          fallback={
            <div className="h-9 w-full max-w-xs animate-pulse rounded-full bg-zinc-800 sm:w-48" />
          }
        >
          <DashboardDateRange basePath={basePath} />
        </Suspense>
      </div>

      <div className="mt-6">
        {resolvedActiveTab === "ga4" && (
          <div className="space-y-4">
            {!ga4Connected && (
              <IntegrationEmptyState
                icon={BarChart3}
                title="GA4 não conectado"
                description="Configure o Google Analytics 4 na página de integrações deste cliente para visualizar tráfego, canais e cidades."
                actionLabel="Configurar Integrações"
                actionHref={integrationsHref}
              />
            )}

            {ga4Connected && ga4Error && (
              <div
                role="alert"
                className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
              >
                {ga4Error}
              </div>
            )}

            {ga4Connected && !ga4Error && !ga4Report && (
              <IntegrationEmptyState
                icon={BarChart3}
                title="Aguardando dados do GA4"
                description="Selecione a propriedade GA4 na página de integrações para carregar os gráficos deste cliente."
                actionLabel="Configurar Integrações"
                actionHref={integrationsHref}
              />
            )}

            {ga4Report && (
              <Ga4DashboardCharts report={ga4Report} variant="client" />
            )}
          </div>
        )}

        {resolvedActiveTab === "google_ads" && (
          <div className="space-y-4">
            {!googleAdsConnected && (
              <IntegrationEmptyState
                icon={CircleDollarSign}
                title="Google Ads não conectado"
                description="Conecte o Google Ads na página de integrações deste cliente para visualizar investimento, impressões, cliques e CTR."
                actionLabel="Configurar Integrações"
                actionHref={integrationsHref}
              />
            )}

            {googleAdsConnected && !googleAdsAccountSelected && (
              <IntegrationEmptyState
                icon={CircleDollarSign}
                title="Selecione a conta de anúncios"
                description="A conexão com o Google Ads foi concluída. Escolha a conta de anúncios na página de integrações para carregar as métricas."
                actionLabel="Selecionar conta"
                actionHref={integrationsHref}
              />
            )}

            {googleAdsConnected &&
              googleAdsAccountSelected &&
              !hasGoogleAdsMetrics && (
                <IntegrationEmptyState
                  icon={CircleDollarSign}
                  title="Aguardando dados do Google Ads"
                  description="Não há métricas sincronizadas para o período selecionado. Use o botão de sincronização na página de integrações."
                  actionLabel="Configurar Integrações"
                  actionHref={integrationsHref}
                />
              )}

            {googleAdsConnected &&
              googleAdsAccountSelected &&
              hasGoogleAdsMetrics && (
                <GoogleAdsDashboardSummary data={googleAdsMetrics} />
              )}
          </div>
        )}

        {resolvedActiveTab === "meta" && (
          <div className="space-y-4">
            {!metaConnected && (
              <IntegrationEmptyState
                icon={Megaphone}
                title="Conecte sua conta do Meta"
                description="Conecte o Meta Ads na página de integrações deste cliente para visualizar investimento, impressões, cliques e CTR."
                actionLabel="Configurar Integrações"
                actionHref={integrationsHref}
              />
            )}

            {metaConnected && !metaAccountSelected && (
              <IntegrationEmptyState
                icon={Megaphone}
                title="Selecione a conta de anúncios"
                description="A conexão com o Meta foi concluída. Escolha a conta de anúncios na página de integrações para carregar as métricas."
                actionLabel="Selecionar conta"
                actionHref={integrationsHref}
              />
            )}

            {metaConnected && metaAccountSelected && metaError && (
              <div
                role="alert"
                className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
              >
                {metaError}
              </div>
            )}

            {metaConnected && metaAccountSelected && !metaError && !metaInsights && (
              <IntegrationEmptyState
                icon={Megaphone}
                title="Aguardando dados do Meta"
                description="Não foi possível carregar métricas para o período selecionado."
                actionLabel="Configurar Integrações"
                actionHref={integrationsHref}
              />
            )}

            {metaInsights && <MetaDashboardSummary insights={metaInsights} />}
          </div>
        )}

        {resolvedActiveTab === "crm" && (
          <div className="space-y-4">
            {!acConnected && (
              <IntegrationEmptyState
                icon={Users}
                title="ActiveCampaign não conectado"
                description="Configure a URL da conta e o API Token do ActiveCampaign na página de integrações para visualizar negócios, estágios e vendedores."
                actionLabel="Configurar Integrações"
                actionHref={integrationsHref}
              />
            )}

            {acConnected && !acPipelineSelected && (
              <IntegrationEmptyState
                icon={Users}
                title="Selecione um funil"
                description="Escolha o funil do ActiveCampaign na página de integrações para carregar os negócios deste cliente no dashboard CRM."
                actionLabel="Configurar Integrações"
                actionHref={integrationsHref}
              />
            )}

            {acConnected && acPipelineSelected && (
              <Suspense
                key={crmMetricsKey}
                fallback={<CrmDealMetricsSkeleton />}
              >
                {crmMetricsContent}
              </Suspense>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

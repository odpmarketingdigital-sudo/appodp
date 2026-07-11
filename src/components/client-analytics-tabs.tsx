"use client";

import { Suspense, useState, type ReactNode } from "react";
import { BarChart3, Megaphone, Users } from "lucide-react";

import { CrmDealMetricsSkeleton } from "@/components/crm-deal-metrics-skeleton";
import { DashboardDateRange } from "@/components/dashboard-date-range";
import { Ga4DashboardCharts } from "@/components/ga4-dashboard-charts";
import { IntegrationEmptyState } from "@/components/integration-empty-state";
import { MetaDashboardSummary } from "@/components/meta-dashboard-summary";
import type { GA4DashboardReport } from "@/types/ga4";
import type { MetaInsightsSummary } from "@/types/meta";

const TABS = [
  { id: "ga4", label: "Google Analytics 4", icon: BarChart3 },
  { id: "meta", label: "Meta Ads", icon: Megaphone },
  { id: "crm", label: "CRM", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ClientAnalyticsTabsProps = {
  basePath: string;
  integrationsHref: string;
  ga4Connected: boolean;
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
  const [activeTab, setActiveTab] = useState<TabId>("ga4");

  return (
    <section>
      <div className="inline-flex flex-wrap gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={
                isActive
                  ? "inline-flex items-center gap-2 rounded-full bg-zinc-700 px-4 py-2 text-xs font-medium text-zinc-100"
                  : "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              }
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <Suspense
          fallback={
            <div className="h-9 w-48 animate-pulse rounded-full bg-zinc-800" />
          }
        >
          <DashboardDateRange basePath={basePath} />
        </Suspense>
      </div>

      <div className="mt-6">
        {activeTab === "ga4" && (
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

        {activeTab === "meta" && (
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

        {activeTab === "crm" && (
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

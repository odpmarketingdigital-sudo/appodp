"use client";

import { useState } from "react";
import { BarChart3, Megaphone, Users } from "lucide-react";

import { CrmDealMetricsDashboard } from "@/components/crm-deal-metrics-dashboard";
import { Ga4DashboardCharts } from "@/components/ga4-dashboard-charts";
import { IntegrationEmptyState } from "@/components/integration-empty-state";
import type { DealMetricsReport } from "@/types/activecampaign";
import type { GA4DashboardReport } from "@/types/ga4";

const TABS = [
  { id: "ga4", label: "Google Analytics 4", icon: BarChart3 },
  { id: "meta", label: "Meta Ads", icon: Megaphone },
  { id: "crm", label: "CRM", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ClientAnalyticsTabsProps = {
  integrationsHref: string;
  ga4Connected: boolean;
  metaConnected: boolean;
  acConnected: boolean;
  ga4Report: GA4DashboardReport | null;
  ga4Error: string | null;
  dealMetrics: DealMetricsReport | null;
  dealMetricsError: string | null;
};

export function ClientAnalyticsTabs({
  integrationsHref,
  ga4Connected,
  metaConnected,
  acConnected,
  ga4Report,
  ga4Error,
  dealMetrics,
  dealMetricsError,
}: ClientAnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ga4");

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">Analytics</h2>
        <p className="text-sm text-zinc-400">
          Visão detalhada por canal de aquisição.
        </p>
      </div>

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1">
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
        <IntegrationEmptyState
          icon={Megaphone}
          title={metaConnected ? "Meta Ads — em breve" : "Conecte sua conta do Meta"}
          description={
            metaConnected
              ? "A conta está conectada. Os gráficos detalhados de campanhas, alcance e custo serão exibidos aqui em uma próxima atualização."
              : "Conecte o Meta Ads na página de integrações para preparar este painel com métricas de Facebook e Instagram."
          }
          actionLabel="Configurar Integrações"
          actionHref={integrationsHref}
        />
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

          {acConnected && dealMetricsError && (
            <div
              role="alert"
              className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              {dealMetricsError}
            </div>
          )}

          {acConnected && !dealMetricsError && dealMetrics && (
            <CrmDealMetricsDashboard report={dealMetrics} />
          )}
        </div>
      )}
    </section>
  );
}

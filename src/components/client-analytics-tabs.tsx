"use client";

import { useState } from "react";
import { BarChart3, Megaphone, Users } from "lucide-react";

import { Ga4DashboardCharts } from "@/components/ga4-dashboard-charts";
import { IntegrationEmptyState } from "@/components/integration-empty-state";
import { SyncMetricsButton } from "@/components/sync-metrics-button";
import { IntegrationProvider } from "@/app/generated/prisma";
import type { GA4DashboardReport } from "@/types/ga4";

const TABS = [
  { id: "ga4", label: "Google Analytics 4", icon: BarChart3 },
  { id: "meta", label: "Meta Ads", icon: Megaphone },
  { id: "crm", label: "CRM", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

type ClientAnalyticsTabsProps = {
  clientId: string;
  ga4Connected: boolean;
  metaConnected: boolean;
  ga4Report: GA4DashboardReport | null;
  ga4Error: string | null;
};

export function ClientAnalyticsTabs({
  clientId,
  ga4Connected,
  metaConnected,
  ga4Report,
  ga4Error,
}: ClientAnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ga4");

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Analytics</h2>
          <p className="text-sm text-zinc-400">
            Visão detalhada por canal de aquisição.
          </p>
        </div>

        {activeTab === "ga4" && (
          <SyncMetricsButton
            clientId={clientId}
            provider={IntegrationProvider.GA4}
            label="GA4"
            disabled={!ga4Connected}
          />
        )}
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
              description="Conecte o Google Analytics 4 na seção de integrações abaixo para visualizar tráfego, canais e cidades deste cliente."
              actionLabel="Conecte na seção Integrações"
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
              description="Configure o ID da propriedade GA4 na integração e sincronize para carregar os gráficos."
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
              : "Conecte o Meta Ads na seção de integrações para preparar este painel com métricas de Facebook e Instagram."
          }
          actionLabel={metaConnected ? "Integração futura" : "Conecte na seção Integrações"}
        />
      )}

      {activeTab === "crm" && (
        <IntegrationEmptyState
          icon={Users}
          title="CRM — integração futura"
          description="Em breve você poderá acompanhar leads, oportunidades e vendas do RD Station e ActiveCampaign diretamente nesta aba."
          actionLabel="Integração futura"
        />
      )}
    </section>
  );
}

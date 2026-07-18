"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Eye, MousePointerClick, Percent, Wallet } from "lucide-react";

import type { MetricPoint } from "@/components/metrics-chart";
import type { GoogleAdsCampaignPerformanceRow } from "@/types/google-ads";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

const CTR_ALERT_THRESHOLD = 1.5;

type CampaignStatusFilter = "all" | "active" | "paused";

const CAMPAIGN_STATUS_TABS: {
  id: CampaignStatusFilter;
  label: string;
}[] = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Ativas" },
  { id: "paused", label: "Pausadas" },
];

function sortByConversions(campaigns: GoogleAdsCampaignPerformanceRow[]) {
  return [...campaigns].sort((a, b) => b.conversions - a.conversions);
}

function isPausedCampaign(campaign: GoogleAdsCampaignPerformanceRow): boolean {
  return campaign.status === "PAUSED";
}

function isActiveCampaign(campaign: GoogleAdsCampaignPerformanceRow): boolean {
  return campaign.isActive || campaign.status === "ENABLED";
}

function filterCampaignsByStatus(
  campaigns: GoogleAdsCampaignPerformanceRow[],
  statusFilter: CampaignStatusFilter,
): GoogleAdsCampaignPerformanceRow[] {
  const filtered =
    statusFilter === "active"
      ? campaigns.filter(isActiveCampaign)
      : statusFilter === "paused"
        ? campaigns.filter(isPausedCampaign)
        : campaigns;

  return sortByConversions(filtered);
}

type GoogleAdsDashboardSummaryProps = {
  data: MetricPoint[];
  campaigns: GoogleAdsCampaignPerformanceRow[];
  variant?: "agency" | "client";
};

function aggregateMetrics(data: MetricPoint[]) {
  return data.reduce(
    (acc, point) => ({
      spend: acc.spend + point.cost,
      impressions: acc.impressions + point.impressions,
      clicks: acc.clicks + point.clicks,
    }),
    { spend: 0, impressions: 0, clicks: 0 },
  );
}

type CampaignAlert = {
  campaignName: string;
  message: string;
  tone: "amber" | "red";
};

function buildCampaignAlerts(
  campaigns: GoogleAdsCampaignPerformanceRow[],
): CampaignAlert[] {
  const alerts: CampaignAlert[] = [];

  for (const campaign of campaigns) {
    if (!campaign.isActive) continue;

    if (campaign.spend > 0 && campaign.conversions === 0) {
      alerts.push({
        campaignName: campaign.name,
        message: "Gastou verba no período e não gerou conversões.",
        tone: "red",
      });
      continue;
    }

    if (campaign.impressions >= 100 && campaign.ctr < CTR_ALERT_THRESHOLD) {
      alerts.push({
        campaignName: campaign.name,
        message: `CTR de ${numberFormatter.format(Math.round(campaign.ctr * 100) / 100)}% — abaixo de ${CTR_ALERT_THRESHOLD}%. Revise criativos e segmentação.`,
        tone: "amber",
      });
    }
  }

  return alerts;
}

function CampaignAlertsPanel({ alerts }: { alerts: CampaignAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden />
        <h4 className="text-sm font-semibold text-amber-200">
          Alertas de atenção
        </h4>
      </div>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li
            key={`${alert.campaignName}-${alert.message}`}
            className={
              alert.tone === "red"
                ? "rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-200"
                : "rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100"
            }
          >
            <span className="font-medium text-zinc-100">{alert.campaignName}</span>
            <span className="text-zinc-400"> — </span>
            {alert.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CampaignPerformanceTable({
  campaigns,
}: {
  campaigns: GoogleAdsCampaignPerformanceRow[];
}) {
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>("active");

  const counts = useMemo(
    () => ({
      all: campaigns.length,
      active: campaigns.filter(isActiveCampaign).length,
      paused: campaigns.filter(isPausedCampaign).length,
    }),
    [campaigns],
  );

  const filteredCampaigns = useMemo(
    () => filterCampaignsByStatus(campaigns, statusFilter),
    [campaigns, statusFilter],
  );

  const emptyMessage =
    statusFilter === "active"
      ? "Nenhuma campanha ativa com dados no período selecionado."
      : statusFilter === "paused"
        ? "Nenhuma campanha pausada com dados no período selecionado."
        : "Nenhuma campanha com dados no período. Sincronize as métricas ou verifique se há campanhas na conta.";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-zinc-100">
          Desempenho por campanha
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          Ordenado por conversões (maior primeiro) no período selecionado.
        </p>
      </div>

      <div className="-mx-1 mb-4 max-w-full overflow-x-auto px-1 pb-1">
        <div
          className="inline-flex min-w-max gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1"
          role="tablist"
          aria-label="Filtrar campanhas por status"
        >
          {CAMPAIGN_STATUS_TABS.map(({ id, label }) => {
            const isActive = statusFilter === id;
            const count = counts[id];
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setStatusFilter(id)}
                className={
                  isActive
                    ? "inline-flex items-center gap-1.5 rounded-full bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100"
                    : "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                }
              >
                <span>{label}</span>
                <span
                  className={
                    isActive
                      ? "tabular-nums text-zinc-300"
                      : "tabular-nums text-zinc-500"
                  }
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredCampaigns.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="pb-3 pr-4 font-medium">Campanha</th>
                <th className="pb-3 pr-4 font-medium text-right">Investimento</th>
                <th className="pb-3 pr-4 font-medium text-right">Cliques</th>
                <th className="pb-3 pr-4 font-medium text-right">CTR</th>
                <th className="pb-3 pr-4 font-medium text-right">Conversões</th>
                <th className="pb-3 font-medium text-right">CPL</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((campaign) => (
                <tr
                  key={campaign.campaignId}
                  className="border-b border-zinc-800/60 last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-100">
                        {campaign.name}
                      </p>
                      {statusFilter === "all" && !campaign.isActive && (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {campaign.status}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-300">
                    {currencyFormatter.format(campaign.spend)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-300">
                    {numberFormatter.format(campaign.clicks)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-300">
                    {numberFormatter.format(Math.round(campaign.ctr * 100) / 100)}%
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-300">
                    {numberFormatter.format(campaign.conversions)}
                  </td>
                  <td className="py-3 text-right tabular-nums text-zinc-300">
                    {campaign.cpl != null
                      ? currencyFormatter.format(campaign.cpl)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function GoogleAdsDashboardSummary({
  data,
  campaigns,
  variant = "client",
}: GoogleAdsDashboardSummaryProps) {
  const totals = aggregateMetrics(data);
  const ctr =
    totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const alerts = buildCampaignAlerts(campaigns);

  const cards = [
    {
      label: "Investimento",
      value: currencyFormatter.format(totals.spend),
      hint: "Gasto total no período",
      icon: Wallet,
      accent: "text-red-400",
    },
    {
      label: "Impressões",
      value: numberFormatter.format(totals.impressions),
      hint: "Exibições dos anúncios",
      icon: Eye,
      accent: "text-sky-400",
    },
    {
      label: "Cliques",
      value: numberFormatter.format(totals.clicks),
      hint: "Interações com os anúncios",
      icon: MousePointerClick,
      accent: "text-emerald-400",
    },
    {
      label: "CTR",
      value: `${numberFormatter.format(Math.round(ctr * 100) / 100)}%`,
      hint: "Taxa de cliques",
      icon: Percent,
      accent: "text-violet-400",
    },
  ];

  return (
    <section className="min-w-0 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-100">
          {variant === "agency" ? "Google Ads — visão geral" : "Google Ads"}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Métricas da conta de anúncios conectada no período selecionado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.accent}`} aria-hidden />
              </div>
              <p className="mt-3 break-words text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <CampaignAlertsPanel alerts={alerts} />

      <CampaignPerformanceTable campaigns={campaigns} />
    </section>
  );
}

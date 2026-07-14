import { Eye, MousePointerClick, Percent, Wallet } from "lucide-react";

import type { MetaInsightsSummary } from "@/types/meta";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

type MetaDashboardSummaryProps = {
  insights: MetaInsightsSummary;
  variant?: "agency" | "client";
};

export function MetaDashboardSummary({
  insights,
  variant = "client",
}: MetaDashboardSummaryProps) {
  const ctrPercent = insights.ctr <= 1 ? insights.ctr * 100 : insights.ctr;

  const cards = [
    {
      label: "Investimento",
      value: currencyFormatter.format(insights.spend),
      hint: "Gasto total no período",
      icon: Wallet,
      accent: "text-red-400",
    },
    {
      label: "Impressões",
      value: numberFormatter.format(insights.impressions),
      hint: "Exibições dos anúncios",
      icon: Eye,
      accent: "text-sky-400",
    },
    {
      label: "Cliques",
      value: numberFormatter.format(insights.clicks),
      hint: "Interações com os anúncios",
      icon: MousePointerClick,
      accent: "text-emerald-400",
    },
    {
      label: "CTR",
      value: `${numberFormatter.format(Math.round(ctrPercent * 100) / 100)}%`,
      hint: "Taxa de cliques",
      icon: Percent,
      accent: "text-violet-400",
    },
  ];

  return (
    <section className="min-w-0 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-100">
          {variant === "agency" ? "Meta Ads — visão geral" : "Meta Ads"}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Métricas reais da conta de anúncios conectada.
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
    </section>
  );
}

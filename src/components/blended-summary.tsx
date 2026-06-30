import { DollarSign, Target, TrendingUp, Users } from "lucide-react";

import { IntegrationProvider } from "@/app/generated/prisma";
import type { MetricChannel } from "@/components/metrics-chart";

/**
 * Canais de mídia paga. O investimento (cost) e as conversões contam como
 * "anúncios"; o RD Station é tratado à parte como canal de Inbound/Leads.
 */
const AD_CHANNELS: IntegrationProvider[] = [
  IntegrationProvider.META_ADS,
  IntegrationProvider.GOOGLE_ADS,
];

const RANGE_DAYS = 30;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numberFormatter = new Intl.NumberFormat("pt-BR");

function isAdChannel(provider: string): boolean {
  return AD_CHANNELS.some((channel) => channel === provider);
}

/** Data de corte (`YYYY-MM-DD`) para considerar apenas os últimos N dias. */
function cutoffDate(days: number): string {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
  return cutoff.toISOString().slice(0, 10);
}

type BlendedSummaryProps = {
  channels: MetricChannel[];
};

export function BlendedSummary({ channels }: BlendedSummaryProps) {
  const since = cutoffDate(RANGE_DAYS);

  let totalInvestment = 0;
  let totalRevenue = 0;
  let totalLeads = 0;

  for (const channel of channels) {
    const adChannel = isAdChannel(channel.provider);
    const isRdStation = channel.provider === IntegrationProvider.RD_STATION;

    for (const point of channel.data) {
      if (point.date < since) {
        continue;
      }

      totalRevenue += point.revenue;

      if (adChannel) {
        totalInvestment += point.cost;
        // Conversões dos canais de anúncios entram como leads.
        totalLeads += point.conversions;
      }

      if (isRdStation) {
        // No RD Station, "clicks" representa os Leads do funil.
        totalLeads += point.clicks;
      }
    }
  }

  const blendedRoas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;

  const cards = [
    {
      label: "Investimento Total",
      value: currencyFormatter.format(totalInvestment),
      hint: "Soma de custo dos canais de anúncios",
      icon: DollarSign,
      accent: "text-red-400",
    },
    {
      label: "Receita Total",
      value: currencyFormatter.format(totalRevenue),
      hint: "Soma de receita de todos os canais",
      icon: TrendingUp,
      accent: "text-emerald-400",
    },
    {
      label: "ROAS Blended",
      value:
        totalInvestment > 0
          ? `${numberFormatter.format(Math.round(blendedRoas * 100) / 100)}×`
          : "—",
      hint: "Receita ÷ Investimento",
      icon: Target,
      accent: "text-violet-400",
    },
    {
      label: "Leads Totais",
      value: numberFormatter.format(totalLeads),
      hint: "Leads do RD Station + conversões de anúncios",
      icon: Users,
      accent: "text-sky-400",
    },
  ];

  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">
          Visão consolidada
        </h2>
        <p className="text-sm text-zinc-400">
          Métricas combinadas de todos os canais nos últimos {RANGE_DAYS} dias.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.accent}`} aria-hidden />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
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

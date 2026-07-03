"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { DealMetricsOwnerRow, DealMetricsReport } from "@/types/activecampaign";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

type CrmDealMetricsDashboardProps = {
  report: DealMetricsReport;
};

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: DealMetricsReport["stages"];
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-500">
              <th className="pb-2 pr-4 font-medium">Nome</th>
              <th className="pb-2 pr-4 font-medium text-right">Qtd.</th>
              <th className="pb-2 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-zinc-800/60 last:border-0">
                <td className="py-2.5 pr-4 text-zinc-200">{row.name}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-zinc-300">
                  {numberFormatter.format(row.count)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-zinc-300">
                  {currencyFormatter.format(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OwnerAccordionCard({ owner }: { owner: DealMetricsOwnerRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-zinc-800/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-100">{owner.name}</span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
              {numberFormatter.format(owner.count)} leads
            </span>
          </div>
          <p className="mt-1 text-sm text-emerald-400">
            {currencyFormatter.format(owner.value)}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {expanded && owner.stages.length > 0 && (
        <div className="border-t border-zinc-800 px-4 py-4">
          <ul className="space-y-4">
            {owner.stages.map((stage) => {
              const progress =
                owner.count > 0 ? (stage.count / owner.count) * 100 : 0;

              return (
                <li key={stage.name}>
                  <p className="text-sm text-zinc-300">
                    Etapa: {stage.name} {"->"} {numberFormatter.format(stage.count)}{" "}
                    leads
                  </p>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-violet-500/70 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function OwnersAccordion({ owners }: { owners: DealMetricsOwnerRow[] }) {
  if (owners.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <h3 className="text-sm font-semibold text-zinc-100">
        Desempenho por vendedor
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Clique em um vendedor para ver o detalhamento por etapa do funil.
      </p>
      <div className="mt-4 space-y-3">
        {owners.map((owner) => (
          <OwnerAccordionCard key={owner.name} owner={owner} />
        ))}
      </div>
    </div>
  );
}

export function CrmDealMetricsDashboard({ report }: CrmDealMetricsDashboardProps) {
  const { kpis } = report;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <span className="text-sm text-zinc-400">Negócios</span>
          <p className="mt-3 text-3xl font-semibold text-zinc-100">
            {numberFormatter.format(kpis.totalCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <span className="text-sm text-zinc-400">Valor total</span>
          <p className="mt-3 text-3xl font-semibold text-emerald-400">
            {currencyFormatter.format(kpis.totalValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <span className="text-sm text-zinc-400">Ganhos</span>
          <p className="mt-3 text-3xl font-semibold text-blue-400">
            {numberFormatter.format(kpis.winCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <span className="text-sm text-zinc-400">Perdidos</span>
          <p className="mt-3 text-3xl font-semibold text-red-400">
            {numberFormatter.format(kpis.loseCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <span className="text-sm text-zinc-400">Ticket médio</span>
          <p className="mt-3 text-3xl font-semibold text-violet-400">
            {currencyFormatter.format(kpis.ticketMedio)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownTable title="Por estágio" rows={report.stages} />
        <OwnersAccordion owners={report.owners} />
      </div>
    </div>
  );
}

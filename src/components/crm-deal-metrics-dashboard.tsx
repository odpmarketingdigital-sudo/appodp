import type { DealMetricsReport } from "@/types/activecampaign";

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

const MAX_DEALS_DISPLAYED = 100 * 50;

export function CrmDealMetricsDashboard({ report }: CrmDealMetricsDashboardProps) {
  const { kpis } = report;

  return (
    <div className="space-y-4">
      {report.truncated && (
        <div
          role="status"
          className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200"
        >
          {report.longPeriod ? (
            <>
              Exibindo até {numberFormatter.format(MAX_DEALS_DISPLAYED)} negócios
              do período. Para intervalos maiores que 31 dias, recomendamos
              exportar o relatório completo diretamente no ActiveCampaign.
            </>
          ) : (
            <>
              Exibindo até {numberFormatter.format(MAX_DEALS_DISPLAYED)} negócios
              do período. Refine o intervalo de datas para ver todos os registros.
            </>
          )}
        </div>
      )}

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
        <BreakdownTable title="Por vendedor" rows={report.owners} />
      </div>
    </div>
  );
}

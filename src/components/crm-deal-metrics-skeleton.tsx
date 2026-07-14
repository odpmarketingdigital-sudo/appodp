export function CrmDealMetricsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando métricas do CRM">
      <p className="text-xs text-zinc-500">
        Consolidando leads do período selecionado…
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
            <div className="mt-3 h-9 w-24 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-8 animate-pulse rounded-lg bg-zinc-800"
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-zinc-900"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

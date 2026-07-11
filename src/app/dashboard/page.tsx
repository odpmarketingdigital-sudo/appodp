import { Suspense } from "react";
import { Users } from "lucide-react";

import { auth } from "@/auth";
import { DashboardDateRange } from "@/components/dashboard-date-range";
import { Ga4DashboardCharts } from "@/components/ga4-dashboard-charts";
import { getCurrentMembership } from "@/lib/company";
import { getCompanyGa4Overview } from "@/lib/company-ga4";
import {
  parseDateRangePreset,
  resolveDateRangePreset,
} from "@/lib/date-ranges";
import { prisma } from "@/lib/prisma";

type DashboardPageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  const membership = session?.user?.id
    ? await getCurrentMembership(session.user.id)
    : null;

  const params = await searchParams;
  const period = parseDateRangePreset(params.period);
  const range = resolveDateRangePreset(period);

  const totalClients = membership
    ? await prisma.client.count({
        where: { companyId: membership.company.id },
      })
    : 0;

  let ga4Report = null;
  let ga4Error: string | null = null;

  if (membership) {
    try {
      ga4Report = await getCompanyGa4Overview(membership.company.id, range);
    } catch (error) {
      ga4Error =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados do GA4.";
    }
  }

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Visão Geral
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Analytics profissional da sua agência via Google Analytics 4.
            </p>
          </div>
          <Suspense
            fallback={
              <div className="h-9 w-48 animate-pulse rounded-full bg-zinc-800" />
            }
          >
            <DashboardDateRange />
          </Suspense>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Total de Clientes</span>
              <Users className="h-5 w-5 text-zinc-500" aria-hidden />
            </div>
            <p className="mt-3 text-3xl font-semibold text-zinc-100">
              {totalClients.toLocaleString("pt-BR")}
            </p>
            <p className="mt-1 text-xs text-zinc-500">clientes cadastrados</p>
          </div>

          {ga4Report && (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <span className="text-sm text-zinc-400">Visitas (GA4)</span>
                <p className="mt-3 text-3xl font-semibold text-blue-400">
                  {ga4Report.summary.activeUsers.toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">activeUsers</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <span className="text-sm text-zinc-400">Sessões engajadas</span>
                <p className="mt-3 text-3xl font-semibold text-emerald-400">
                  {ga4Report.summary.engagedSessions.toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">engagedSessions</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <span className="text-sm text-zinc-400">Eventos</span>
                <p className="mt-3 text-3xl font-semibold text-violet-400">
                  {ga4Report.summary.eventCount.toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">eventCount</p>
              </div>
            </>
          )}
        </div>

        {ga4Error && (
          <div
            role="alert"
            className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
          >
            {ga4Error}
          </div>
        )}

        {!ga4Report && !ga4Error && (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-300">
              Conecte o GA4 e selecione uma propriedade
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Configure o GA4 e selecione a propriedade em cada cliente em
              Configurar Integrações. Para Meta Ads, conecte e selecione a conta
              de anúncios por cliente na mesma página.
            </p>
          </div>
        )}

        {ga4Report && <Ga4DashboardCharts report={ga4Report} variant="agency" />}
      </div>
    </main>
  );
}

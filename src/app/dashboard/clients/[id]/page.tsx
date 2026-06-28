import { notFound, redirect } from "next/navigation";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { IntegrationCard } from "@/components/integration-card";
import {
  MetricsChart,
  type MetricChannel,
  type MetricPoint,
} from "@/components/metrics-chart";
import { SyncMetricsButton } from "@/components/sync-metrics-button";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";

/** Provedores com coleta de métricas habilitada (integração real). */
const CHART_PROVIDERS = [
  { provider: IntegrationProvider.GA4, label: "GA4" },
  { provider: IntegrationProvider.META_ADS, label: "Meta Ads" },
  { provider: IntegrationProvider.RD_STATION, label: "RD Station" },
] as const;

const PROVIDERS = [
  {
    provider: IntegrationProvider.GA4,
    label: "Google Analytics 4",
    description: "Tráfego, eventos e conversões do GA4.",
  },
  {
    provider: IntegrationProvider.GOOGLE_ADS,
    label: "Google Ads",
    description: "Campanhas, cliques e custos do Google Ads.",
  },
  {
    provider: IntegrationProvider.META_ADS,
    label: "Meta Ads",
    description: "Anúncios do Facebook e Instagram.",
  },
  {
    provider: IntegrationProvider.RD_STATION,
    label: "RD Station",
    description: "Automação de marketing e geração de leads.",
  },
  {
    provider: IntegrationProvider.ACTIVECAMPAIGN,
    label: "ActiveCampaign",
    description: "E-mail marketing e automações.",
  },
] as const;

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    redirect("/dashboard/clients");
  }

  // Isolamento multi-tenant: só carrega o cliente se for da empresa do usuário.
  const client = await prisma.client.findFirst({
    where: { id, companyId: membership.company.id },
    include: { integrationTokens: true },
  });

  if (!client) {
    notFound();
  }

  const tokensByProvider = new Map(
    client.integrationTokens.map((token) => [token.provider, token]),
  );

  // Histórico de todos os provedores com gráfico, agrupado por provedor.
  const metricHistory = await prisma.marketingMetricHistory.findMany({
    where: {
      clientId: client.id,
      provider: { in: CHART_PROVIDERS.map((c) => c.provider) },
    },
    orderBy: { date: "asc" },
  });

  const seriesByProvider = new Map<IntegrationProvider, MetricPoint[]>();
  for (const row of metricHistory) {
    const point: MetricPoint = {
      date: row.date.toISOString().slice(0, 10),
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      conversions: row.conversions,
      revenue: row.revenue,
    };
    const list = seriesByProvider.get(row.provider) ?? [];
    list.push(point);
    seriesByProvider.set(row.provider, list);
  }

  const channels: MetricChannel[] = CHART_PROVIDERS.map(({ provider, label }) => ({
    provider,
    label,
    data: seriesByProvider.get(provider) ?? [],
  }));

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            {client.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {client.email ?? "Sem e-mail"} · Integrações de marketing
          </p>
        </header>

        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Desempenho</h2>
              <p className="text-sm text-zinc-400">
                Série diária dos últimos 30 dias por canal.
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {CHART_PROVIDERS.map(({ provider, label }) => (
                <SyncMetricsButton
                  key={provider}
                  clientId={client.id}
                  provider={provider}
                  label={label}
                  disabled={!tokensByProvider.get(provider)?.isActive}
                />
              ))}
            </div>
          </div>
          <MetricsChart channels={channels} />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">
            Integrações
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROVIDERS.map(({ provider, label, description }) => {
              const token = tokensByProvider.get(provider);
              const connected = Boolean(token?.isActive);
              const externalAccountId = token?.externalAccountId ?? null;
              return (
                <IntegrationCard
                  // Remonta o card quando o estado de conexão muda (após salvar),
                  // fechando o formulário e reiniciando o estado da action.
                  key={`${provider}-${connected}-${externalAccountId ?? ""}`}
                  clientId={client.id}
                  provider={provider}
                  label={label}
                  description={description}
                  connected={connected}
                  externalAccountId={externalAccountId}
                />
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

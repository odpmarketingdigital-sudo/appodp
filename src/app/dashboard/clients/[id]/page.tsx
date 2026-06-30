import { notFound, redirect } from "next/navigation";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { BlendedSummary } from "@/components/blended-summary";
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

const INTEGRATION_ERROR_MESSAGES: Record<string, string> = {
  google_oauth:
    "Não foi possível concluir a autenticação com o Google. Tente novamente.",
  meta_oauth:
    "Não foi possível concluir a autenticação com o Meta. Tente novamente.",
  state_mismatch:
    "Falha na validação de segurança do fluxo (state). Por favor, tente conectar novamente.",
  invalid_provider: "Provedor de integração inválido.",
  missing_credentials:
    "As credenciais do Google não estão configuradas no servidor.",
  token_exchange:
    "Não foi possível trocar o código de autorização pelo token do Google.",
  no_access_token: "O Google não retornou um token de acesso válido.",
  forbidden: "Você não tem permissão para gerenciar este cliente.",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const integrationSuccess = firstParam(query.integration);
  const integrationError = firstParam(query.integration_error);

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

        {integrationError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <p className="font-medium">Falha ao conectar a integração</p>
            <p className="mt-0.5 text-red-300/90">
              {INTEGRATION_ERROR_MESSAGES[integrationError] ??
                "Ocorreu um problema inesperado durante a autenticação."}
            </p>
          </div>
        )}

        {integrationSuccess && !integrationError && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            <p className="font-medium">Integração conectada com sucesso!</p>
            <p className="mt-0.5 text-emerald-300/90">
              As credenciais foram salvas e já podem ser usadas na
              sincronização.
            </p>
          </div>
        )}

        <BlendedSummary channels={channels} />

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

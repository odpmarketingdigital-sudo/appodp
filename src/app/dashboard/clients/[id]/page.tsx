import { notFound, redirect } from "next/navigation";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { BlendedSummary } from "@/components/blended-summary";
import { ClientAnalyticsTabs } from "@/components/client-analytics-tabs";
import { IntegrationCard } from "@/components/integration-card";
import {
  type MetricChannel,
  type MetricPoint,
} from "@/components/metrics-chart";
import { getCurrentMembership } from "@/lib/company";
import { resolveDateRangePreset } from "@/lib/date-ranges";
import { fetchGa4DashboardReport } from "@/lib/integrations/ga4-api";
import { getValidGoogleAccessToken } from "@/lib/integrations/google-token";
import { prisma } from "@/lib/prisma";

import type { GA4DashboardReport } from "@/types/ga4";

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

  const ga4Token = tokensByProvider.get(IntegrationProvider.GA4);
  const metaToken = tokensByProvider.get(IntegrationProvider.META_ADS);
  const ga4Connected = Boolean(ga4Token?.isActive);
  const metaConnected = Boolean(metaToken?.isActive);

  let ga4Report: GA4DashboardReport | null = null;
  let ga4Error: string | null = null;

  const propertyId = ga4Token?.externalAccountId?.replace(/^properties\//, "");
  if (ga4Connected && propertyId && ga4Token) {
    const accessToken = await getValidGoogleAccessToken({
      accessToken: ga4Token.accessToken,
      refreshToken: ga4Token.refreshToken,
      expiresAt: ga4Token.expiresAt,
    });

    if (accessToken) {
      try {
        ga4Report = await fetchGa4DashboardReport(
          accessToken,
          propertyId,
          resolveDateRangePreset("last30"),
        );
      } catch (error) {
        ga4Error =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados do GA4.";
      }
    }
  }

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
            {client.email ?? "Sem e-mail"} · Visão detalhada por canal
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

        <ClientAnalyticsTabs
          clientId={client.id}
          ga4Connected={ga4Connected}
          metaConnected={metaConnected}
          ga4Report={ga4Report}
          ga4Error={ga4Error}
        />

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

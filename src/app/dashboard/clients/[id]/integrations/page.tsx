import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { Ga4PropertySelector } from "@/components/ga4-property-selector";
import { IntegrationCard } from "@/components/integration-card";
import { SyncMetricsButton } from "@/components/sync-metrics-button";
import { getCurrentMembership } from "@/lib/company";
import { clientHasGa4Token } from "@/lib/client-ga4";
import { prisma } from "@/lib/prisma";

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
    description: "Automação de marketing e geração de leads (CRM).",
  },
  {
    provider: IntegrationProvider.ACTIVECAMPAIGN,
    label: "ActiveCampaign",
    description: "E-mail marketing e automações (CRM).",
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

export default async function ClientIntegrationsPage({
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
  const ga4Connected = Boolean(ga4Token?.isActive);
  const hasGa4Token = await clientHasGa4Token(client.id, membership.company.id);

  const clientBasePath = `/dashboard/clients/${client.id}`;

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href={clientBasePath}
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar ao cliente
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Integrações — {client.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Conecte contas e configure propriedades para este cliente.
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
              As credenciais foram salvas. Selecione a propriedade GA4 abaixo,
              se aplicável.
            </p>
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Propriedade Google Analytics 4
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Escolha qual propriedade GA4 será monitorada neste cliente.
              </p>
            </div>
            {ga4Connected && (
              <SyncMetricsButton
                clientId={client.id}
                provider={IntegrationProvider.GA4}
                label="GA4"
                disabled={!ga4Connected}
              />
            )}
          </div>
          <Ga4PropertySelector
            clientId={client.id}
            hasGa4Token={hasGa4Token}
            currentPropertyId={client.ga4PropertyId}
          />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">
            Conexões
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

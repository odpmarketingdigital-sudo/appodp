import { getClientMetaConnection } from "@/lib/client-meta";
import type { MetaAdAccount } from "@/types/meta";

const META_GRAPH_API = "https://graph.facebook.com/v19.0";

export type MetaInsightsResult = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
};

export type MetaAdAccountsResponse =
  | { ok: true; accounts: MetaAdAccount[] }
  | { ok: false; error: string; accounts?: MetaAdAccount[] };

export type MetaInsightsResponse =
  | { ok: true; data: MetaInsightsResult }
  | { ok: false; error: string; data?: Record<string, never> };

type MetaInsightsApiRow = {
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
};

type MetaInsightsApiResponse = {
  data?: MetaInsightsApiRow[];
  error?: MetaApiError;
};

type MetaAdAccountApiRow = {
  id?: string;
  name?: string;
};

type MetaAdAccountsApiResponse = {
  data?: MetaAdAccountApiRow[];
  error?: MetaApiError;
};

type MetaApiError = {
  message?: string;
  type?: string;
  code?: number;
};

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAdAccountId(adAccountId: string): string {
  return adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;
}

async function getMetaCredentials(
  clientId: string,
  companyId: string,
): Promise<
  | { ok: true; accessToken: string; adAccountId: string | null }
  | { ok: false; error: string }
> {
  if (!clientId) {
    return { ok: false, error: "Cliente não identificado." };
  }

  let connection;
  try {
    connection = await getClientMetaConnection(clientId, companyId);
  } catch {
    return {
      ok: false,
      error: "Não foi possível consultar a integração Meta do cliente.",
    };
  }

  if (!connection) {
    return {
      ok: false,
      error:
        "Integração Meta não configurada. Conecte a conta na página de integrações do cliente.",
    };
  }

  if (!connection.accessToken) {
    return {
      ok: false,
      error: "Token de acesso Meta ausente. Reconecte a integração.",
    };
  }

  return {
    ok: true,
    accessToken: connection.accessToken,
    adAccountId: connection.adAccountId,
  };
}

/**
 * Lista as contas de anúncios disponíveis para o cliente informado.
 */
export async function getMetaAdAccounts(
  clientId: string,
  companyId: string,
): Promise<MetaAdAccountsResponse> {
  const credentials = await getMetaCredentials(clientId, companyId);
  if (!credentials.ok) {
    return { ok: false, error: credentials.error, accounts: [] };
  }

  const url = new URL(`${META_GRAPH_API}/me/adaccounts`);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", credentials.accessToken);

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    return {
      ok: false,
      error: "Falha de rede ao consultar contas de anúncios do Meta.",
      accounts: [],
    };
  }

  let payload: MetaAdAccountsApiResponse;
  try {
    payload = (await response.json()) as MetaAdAccountsApiResponse;
  } catch {
    return {
      ok: false,
      error: "Resposta inválida da API do Meta.",
      accounts: [],
    };
  }

  if (!response.ok || payload.error) {
    return {
      ok: false,
      error:
        payload.error?.message ??
        `Erro da API do Meta (${response.status}).`,
      accounts: [],
    };
  }

  const accounts: MetaAdAccount[] = (payload.data ?? [])
    .filter((row): row is { id: string; name: string } => Boolean(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name ?? row.id,
    }));

  return { ok: true, accounts };
}

/**
 * Busca métricas agregadas do Meta Ads para o cliente no período informado.
 * Lê credenciais da tabela `IntegrationToken` (provider META_ADS).
 */
export async function getMetaInsights(
  clientId: string,
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<MetaInsightsResponse> {
  const credentials = await getMetaCredentials(clientId, companyId);
  if (!credentials.ok) {
    return { ok: false, error: credentials.error, data: {} };
  }

  if (!credentials.adAccountId) {
    return {
      ok: false,
      error:
        "Conta de anúncios não selecionada. Escolha a conta na página de integrações.",
      data: {},
    };
  }

  const accountId = normalizeAdAccountId(credentials.adAccountId);
  const url = new URL(`${META_GRAPH_API}/${accountId}/insights`);
  url.searchParams.set("access_token", credentials.accessToken);
  url.searchParams.set("fields", "spend,impressions,clicks,ctr");
  url.searchParams.set(
    "time_range",
    JSON.stringify({ since: startDate, until: endDate }),
  );
  url.searchParams.set("level", "account");

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    return {
      ok: false,
      error: "Falha de rede ao consultar a API do Meta.",
      data: {},
    };
  }

  let payload: MetaInsightsApiResponse;
  try {
    payload = (await response.json()) as MetaInsightsApiResponse;
  } catch {
    return {
      ok: false,
      error: "Resposta inválida da API do Meta.",
      data: {},
    };
  }

  if (!response.ok || payload.error) {
    return {
      ok: false,
      error:
        payload.error?.message ??
        `Erro da API do Meta (${response.status}).`,
      data: {},
    };
  }

  const row = payload.data?.[0];
  if (!row) {
    return {
      ok: true,
      data: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
      },
    };
  }

  return {
    ok: true,
    data: {
      spend: toNumber(row.spend),
      impressions: toNumber(row.impressions),
      clicks: toNumber(row.clicks),
      ctr: toNumber(row.ctr),
    },
  };
}

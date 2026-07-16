import { IntegrationProvider } from "@/app/generated/prisma";
import type { GoogleAdsCustomerOption, GoogleAdsCustomersListResult } from "@/types/google-ads";

/** Versão REST ativa. Override: GOOGLE_ADS_API_VERSION=v22 (ou 22) */
const DEFAULT_GOOGLE_ADS_API_VERSION = "v22";

function resolveGoogleAdsApiVersion(): string {
  const raw =
    process.env.GOOGLE_ADS_API_VERSION?.trim() ?? DEFAULT_GOOGLE_ADS_API_VERSION;
  return raw.startsWith("v") ? raw : `v${raw}`;
}

const GOOGLE_ADS_API_VERSION = resolveGoogleAdsApiVersion();
const GOOGLE_ADS_API = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export const GOOGLE_ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";
export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";

/** Escopos combinados (legado — não usar em novos fluxos OAuth). */
export const GOOGLE_INTEGRATION_SCOPES = `${GOOGLE_ANALYTICS_SCOPE} ${GOOGLE_ADS_SCOPE}`;

type GoogleOAuthProvider =
  | typeof IntegrationProvider.GA4
  | typeof IntegrationProvider.GOOGLE_ADS;

export function getGoogleOAuthScopesForProvider(
  provider: GoogleOAuthProvider,
): string {
  return provider === IntegrationProvider.GA4
    ? GOOGLE_ANALYTICS_SCOPE
    : GOOGLE_ADS_SCOPE;
}

type ListAccessibleCustomersResponse = {
  resourceNames?: string[];
};

type GoogleAdsSearchResponse = {
  results?: Array<{
    customerClient?: {
      clientCustomer?: string;
      descriptiveName?: string;
      manager?: boolean;
      level?: number;
      id?: string;
    };
  }>;
};

type GoogleAdsErrorPayload = {
  message?: string;
  status?: string;
  code?: number;
  details?: unknown;
};

type GoogleAdsFetchFailure = {
  message: string;
  status?: number;
  statusText?: string;
  url: string;
  rawBody?: string;
  parsedBody?: unknown;
};

function normalizeCustomerIdForHeader(customerId: string): string {
  return customerId.replace(/-/g, "");
}

/**
 * Lê o developer token apenas de variáveis de servidor.
 * NEXT_PUBLIC_* é detectado só para avisar configuração incorreta (nunca deve ser público).
 */
export function resolveGoogleAdsDeveloperToken(): {
  token: string | null;
  envKey: string | null;
} {
  const serverToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (serverToken) {
    return { token: serverToken, envKey: "GOOGLE_ADS_DEVELOPER_TOKEN" };
  }

  const publicToken = process.env.NEXT_PUBLIC_GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (publicToken) {
    console.warn(
      "[Google Ads] Encontrado NEXT_PUBLIC_GOOGLE_ADS_DEVELOPER_TOKEN. " +
        "Developer tokens não devem ser expostos ao cliente — mova para GOOGLE_ADS_DEVELOPER_TOKEN.",
    );
    return {
      token: publicToken,
      envKey: "NEXT_PUBLIC_GOOGLE_ADS_DEVELOPER_TOKEN",
    };
  }

  return { token: null, envKey: null };
}

function buildGoogleAdsHeaders(
  accessToken: string,
  developerToken: string,
  loginCustomerId?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "developer-token": developerToken,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (loginCustomerId) {
    headers["login-customer-id"] = normalizeCustomerIdForHeader(loginCustomerId);
  }

  return headers;
}

function extractGoogleAdsErrorMessage(
  parsedBody: unknown,
  fallback: string,
): string {
  if (!parsedBody || typeof parsedBody !== "object") {
    return fallback;
  }

  const body = parsedBody as { error?: GoogleAdsErrorPayload };
  if (body.error?.message) {
    const status = body.error.status ? ` (${body.error.status})` : "";
    return `${body.error.message}${status}`;
  }

  return fallback;
}

function tryParseJson(textResponse: string): unknown | null {
  if (!textResponse.trim()) {
    return null;
  }

  try {
    return JSON.parse(textResponse) as unknown;
  } catch {
    return null;
  }
}

/**
 * Executa fetch na Google Ads API.
 * Sempre lê `.text()` antes de parsear JSON e loga o body bruto em erros HTTP.
 */
async function googleAdsFetch(
  url: string,
  accessToken: string,
  developerToken: string,
  options: {
    method?: "GET" | "POST";
    loginCustomerId?: string;
    body?: unknown;
  } = {},
): Promise<
  | { ok: true; data: unknown; status: number }
  | { ok: false; failure: GoogleAdsFetchFailure }
> {
  const method = options.method ?? "GET";
  const headers = buildGoogleAdsHeaders(
    accessToken,
    developerToken,
    options.loginCustomerId,
  );

  console.info("[Google Ads] Requisição:", { method, url, apiVersion: GOOGLE_ADS_API_VERSION });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  } catch (error) {
    console.error("ERRO DETALHADO GOOGLE ADS:", {
      context: "googleAdsFetch:network",
      message: error instanceof Error ? error.message : String(error),
      url,
    });
    return {
      ok: false,
      failure: {
        message: "Falha de rede ao consultar a API do Google Ads.",
        url,
      },
    };
  }

  const textResponse = await response.text();

  // Gargalo anterior: JSON.parse era chamado ANTES de checar response.ok,
  // então 404/HTML de erro estourava como "Resposta não-JSON" genérica.
  if (!response.ok) {
    console.error("HTML DE ERRO RETORNADO PELO GOOGLE:", textResponse);
    console.error("ERRO DETALHADO GOOGLE ADS:", {
      context: "googleAdsFetch:http_error",
      message: `Erro na requisição (Status ${response.status})`,
      status: response.status,
      statusText: response.statusText,
      url,
      details: textResponse.substring(0, 4000),
    });

    const parsedBody = tryParseJson(textResponse);

    return {
      ok: false,
      failure: {
        message: extractGoogleAdsErrorMessage(
          parsedBody,
          `Erro na requisição (Status ${response.status}): ${textResponse.substring(0, 500)}`,
        ),
        status: response.status,
        statusText: response.statusText,
        url,
        parsedBody: parsedBody ?? undefined,
        rawBody: textResponse.substring(0, 4000),
      },
    };
  }

  let data: unknown;
  try {
    data = textResponse.trim() ? JSON.parse(textResponse) : {};
  } catch (parseError) {
    console.error("HTML DE ERRO RETORNADO PELO GOOGLE:", textResponse);
    console.error("ERRO DETALHADO GOOGLE ADS:", {
      context: "googleAdsFetch:json_parse_success_status",
      message:
        parseError instanceof Error ? parseError.message : String(parseError),
      status: response.status,
      url,
      details: textResponse.substring(0, 4000),
    });

    return {
      ok: false,
      failure: {
        message: `Resposta não-JSON com status ${response.status}. Verifique GOOGLE_ADS_API_VERSION (atual: ${GOOGLE_ADS_API_VERSION}).`,
        status: response.status,
        statusText: response.statusText,
        url,
        rawBody: textResponse.substring(0, 4000),
      },
    };
  }

  return { ok: true, data, status: response.status };
}

export function hasGoogleAdsScope(scope: string | null | undefined): boolean {
  return scope?.includes(GOOGLE_ADS_SCOPE) ?? false;
}

export function hasGoogleAnalyticsScope(
  scope: string | null | undefined,
): boolean {
  return scope?.includes(GOOGLE_ANALYTICS_SCOPE) ?? false;
}

export function normalizeGoogleAdsCustomerId(resourceName: string): string {
  return resourceName.replace(/^customers\//, "").replace(/-/g, "");
}

function toCustomerOption(
  customerId: string,
  extra?: Partial<GoogleAdsCustomerOption>,
): GoogleAdsCustomerOption {
  const normalizedId = normalizeCustomerIdForHeader(customerId);
  return {
    customerId: normalizedId,
    resourceName: `customers/${normalizedId}`,
    ...extra,
  };
}

/** Consulta subcontas (customer_client) quando o ID retornado é uma MCC. */
async function listManagedCustomerClients(
  managerCustomerId: string,
  accessToken: string,
  developerToken: string,
): Promise<GoogleAdsCustomerOption[]> {
  const loginCustomerId = normalizeCustomerIdForHeader(managerCustomerId);
  const url = `${GOOGLE_ADS_API}/customers/${loginCustomerId}/googleAds:search`;

  const result = await googleAdsFetch(url, accessToken, developerToken, {
    method: "POST",
    loginCustomerId,
    body: {
      query: `
        SELECT
          customer_client.client_customer,
          customer_client.descriptive_name,
          customer_client.manager,
          customer_client.level
        FROM customer_client
        WHERE customer_client.manager = FALSE
          AND customer_client.level <= 1
      `.trim(),
    },
  });

  if (!result.ok) {
    console.info("[Google Ads] Sem subcontas via MCC para", loginCustomerId, {
      reason: result.failure.message,
      status: result.failure.status,
    });
    return [];
  }

  const payload = result.data as GoogleAdsSearchResponse;
  const clients: GoogleAdsCustomerOption[] = [];

  for (const row of payload.results ?? []) {
    const client = row.customerClient;
    if (!client?.clientCustomer) continue;

    const customerId = normalizeGoogleAdsCustomerId(client.clientCustomer);
    if (customerId === loginCustomerId) continue;

    clients.push(
      toCustomerOption(customerId, {
        descriptiveName: client.descriptiveName ?? null,
        managerCustomerId: loginCustomerId,
        isManager: false,
      }),
    );
  }

  return clients;
}

/** Mescla contas diretas e subcontas MCC sem duplicatas. */
async function expandCustomersWithMccHierarchy(
  directCustomers: GoogleAdsCustomerOption[],
  accessToken: string,
  developerToken: string,
): Promise<GoogleAdsCustomerOption[]> {
  const byId = new Map<string, GoogleAdsCustomerOption>();

  for (const customer of directCustomers) {
    byId.set(customer.customerId, customer);
  }

  for (const manager of directCustomers) {
    const subAccounts = await listManagedCustomerClients(
      manager.customerId,
      accessToken,
      developerToken,
    );

    if (subAccounts.length === 0) continue;

    byId.set(manager.customerId, {
      ...manager,
      isManager: true,
    });

    for (const sub of subAccounts) {
      if (!byId.has(sub.customerId)) {
        byId.set(sub.customerId, sub);
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const nameA = a.descriptiveName ?? a.customerId;
    const nameB = b.descriptiveName ?? b.customerId;
    return nameA.localeCompare(nameB, "pt-BR");
  });
}

/** Lista contas Google Ads acessíveis pelo usuário autenticado (inclui subcontas MCC). */
export async function listAccessibleGoogleAdsCustomers(
  accessToken: string,
): Promise<GoogleAdsCustomersListResult> {
  const { token: developerToken, envKey } = resolveGoogleAdsDeveloperToken();

  if (!developerToken) {
    console.error("[Google Ads] Developer token ausente.", {
      checkedKeys: [
        "GOOGLE_ADS_DEVELOPER_TOKEN",
        "NEXT_PUBLIC_GOOGLE_ADS_DEVELOPER_TOKEN",
      ],
    });
    return {
      ok: false,
      error:
        "GOOGLE_ADS_DEVELOPER_TOKEN não configurado no ambiente do servidor.",
      customers: [],
    };
  }

  console.info("[Google Ads] Usando developer token de", envKey, {
    apiVersion: GOOGLE_ADS_API_VERSION,
    baseUrl: GOOGLE_ADS_API,
  });

  const listUrl = `${GOOGLE_ADS_API}/customers:listAccessibleCustomers`;

  try {
    const listResult = await googleAdsFetch(
      listUrl,
      accessToken,
      developerToken,
    );

    if (!listResult.ok) {
      return {
        ok: false,
        error: listResult.failure.message,
        customers: [],
      };
    }

    const payload = listResult.data as ListAccessibleCustomersResponse;
    const directCustomers: GoogleAdsCustomerOption[] = (
      payload.resourceNames ?? []
    )
      .filter((name) => name.startsWith("customers/"))
      .map((resourceName) =>
        toCustomerOption(normalizeGoogleAdsCustomerId(resourceName), {
          descriptiveName: null,
          managerCustomerId: null,
          isManager: false,
        }),
      );

    if (directCustomers.length === 0) {
      console.warn("[Google Ads] listAccessibleCustomers retornou lista vazia.", {
        payload,
      });
      return { ok: true, customers: [] };
    }

    const customers = await expandCustomersWithMccHierarchy(
      directCustomers,
      accessToken,
      developerToken,
    );

    console.info("[Google Ads] Contas resolvidas:", {
      directCount: directCustomers.length,
      totalCount: customers.length,
      managerIds: customers.filter((c) => c.isManager).map((c) => c.customerId),
    });

    return { ok: true, customers };
  } catch (error) {
    console.error("ERRO DETALHADO GOOGLE ADS:", {
      context: "listAccessibleGoogleAdsCustomers",
      message: error instanceof Error ? error.message : String(error),
      url: listUrl,
      details: error,
    });
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao listar contas do Google Ads.",
      customers: [],
    };
  }
}

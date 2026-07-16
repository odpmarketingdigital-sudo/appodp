import type { GoogleAdsCustomerOption, GoogleAdsCustomersListResult } from "@/types/google-ads";

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v17";

export const GOOGLE_ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";
export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";

/** Escopos combinados para OAuth Google (Analytics + Ads). */
export const GOOGLE_INTEGRATION_SCOPES = `${GOOGLE_ANALYTICS_SCOPE} ${GOOGLE_ADS_SCOPE}`;

type ListAccessibleCustomersResponse = {
  resourceNames?: string[];
};

export function hasGoogleAdsScope(scope: string | null | undefined): boolean {
  return scope?.includes(GOOGLE_ADS_SCOPE) ?? false;
}

export function hasGoogleAnalyticsScope(
  scope: string | null | undefined,
): boolean {
  return scope?.includes(GOOGLE_ANALYTICS_SCOPE) ?? false;
}

export function normalizeGoogleAdsCustomerId(resourceName: string): string {
  return resourceName.replace(/^customers\//, "");
}

/** Lista contas Google Ads acessíveis pelo usuário autenticado. */
export async function listAccessibleGoogleAdsCustomers(
  accessToken: string,
): Promise<GoogleAdsCustomersListResult> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    return {
      ok: false,
      error: "GOOGLE_ADS_DEVELOPER_TOKEN não configurado no ambiente.",
      customers: [],
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${GOOGLE_ADS_API}/customers:listAccessibleCustomers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": developerToken,
        },
      },
    );
  } catch {
    return {
      ok: false,
      error: "Falha de rede ao consultar contas do Google Ads.",
      customers: [],
    };
  }

  let payload: ListAccessibleCustomersResponse & { error?: { message?: string } };
  try {
    payload = (await response.json()) as ListAccessibleCustomersResponse & {
      error?: { message?: string };
    };
  } catch {
    return {
      ok: false,
      error: "Resposta inválida da API do Google Ads.",
      customers: [],
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        payload.error?.message ??
        `Erro da API do Google Ads (${response.status}).`,
      customers: [],
    };
  }

  const customers: GoogleAdsCustomerOption[] = (payload.resourceNames ?? [])
    .filter((name) => name.startsWith("customers/"))
    .map((resourceName) => ({
      resourceName,
      customerId: normalizeGoogleAdsCustomerId(resourceName),
    }));

  return { ok: true, customers };
}

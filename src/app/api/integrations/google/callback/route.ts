import { NextResponse, type NextRequest } from "next/server";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import {
  hasGoogleAdsScope,
  hasGoogleAnalyticsScope,
  listAccessibleGoogleAdsCustomers,
} from "@/lib/integrations/google-ads-api";
import { upsertIntegrationToken } from "@/lib/integrations/sync-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const STATE_COOKIE = "google_oauth_state";

type OAuthState = {
  state: string;
  clientId: string;
  provider: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

type TokenPayload = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
};

function parseGoogleProvider(value: string): IntegrationProvider | null {
  if (
    value === IntegrationProvider.GA4 ||
    value === IntegrationProvider.GOOGLE_ADS
  ) {
    return value;
  }
  return null;
}

function parseState(raw: string | undefined): OAuthState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<OAuthState>;
    if (
      typeof parsed.state === "string" &&
      typeof parsed.clientId === "string" &&
      typeof parsed.provider === "string"
    ) {
      return {
        state: parsed.state,
        clientId: parsed.clientId,
        provider: parsed.provider,
      };
    }
  } catch {
    // Cookie corrompido — tratado como ausente.
  }
  return null;
}

/** Redireciona limpando o cookie de estado do fluxo. */
function redirectAndClear(request: NextRequest, target: URL): NextResponse {
  const response = NextResponse.redirect(target);
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

async function persistGa4Integration(
  clientId: string,
  tokens: TokenPayload,
): Promise<void> {
  await upsertIntegrationToken({
    clientId,
    provider: IntegrationProvider.GA4,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    scope: tokens.scope,
  });
}

async function persistGoogleAdsIntegration(
  clientId: string,
  tokens: TokenPayload,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const customersResult = await listAccessibleGoogleAdsCustomers(
    tokens.accessToken,
  );

  if (!customersResult.ok) {
    return { ok: false, reason: "google_ads_customers" };
  }

  const selectedCustomer =
    customersResult.customers.length === 1
      ? customersResult.customers[0]
      : null;

  await upsertIntegrationToken({
    clientId,
    provider: IntegrationProvider.GOOGLE_ADS,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    scope: tokens.scope,
    externalAccountId: selectedCustomer?.customerId ?? null,
    metadata: {
      customers: customersResult.customers,
      ...(selectedCustomer
        ? {
            customerId: selectedCustomer.customerId,
            ...(selectedCustomer.managerCustomerId
              ? { managerCustomerId: selectedCustomer.managerCustomerId }
              : {}),
          }
        : {}),
    },
  });

  return { ok: true };
}

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const context = parseState(request.cookies.get(STATE_COOKIE)?.value);
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const stateParam = params.get("state");
  const oauthError = params.get("error");

  const clientsUrl = new URL("/dashboard/clients", request.url);
  const integrationsPath = (clientId: string) =>
    `/dashboard/clients/${clientId}/integrations`;

  if (oauthError || !code || !stateParam || !context) {
    const target = context
      ? new URL(integrationsPath(context.clientId), request.url)
      : clientsUrl;
    target.searchParams.set("integration_error", "google_oauth");
    return redirectAndClear(request, target);
  }

  if (stateParam !== context.state) {
    const target = new URL(integrationsPath(context.clientId), request.url);
    target.searchParams.set("integration_error", "state_mismatch");
    return redirectAndClear(request, target);
  }

  const provider = parseGoogleProvider(context.provider);
  if (!provider) {
    clientsUrl.searchParams.set("integration_error", "invalid_provider");
    return redirectAndClear(request, clientsUrl);
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!googleClientId || !googleClientSecret) {
    const target = new URL(integrationsPath(context.clientId), request.url);
    target.searchParams.set("integration_error", "missing_credentials");
    return redirectAndClear(request, target);
  }

  const membership = await getCurrentMembership(session.user.id);
  const client = membership
    ? await prisma.client.findFirst({
        where: { id: context.clientId, companyId: membership.company.id },
        select: { id: true },
      })
    : null;

  if (!client) {
    clientsUrl.searchParams.set("integration_error", "forbidden");
    return redirectAndClear(request, clientsUrl);
  }

  const redirectUri = new URL(
    "/api/integrations/google/callback",
    request.url,
  ).toString();

  const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const errorUrl = (reason: string): URL => {
    const target = new URL(integrationsPath(context.clientId), request.url);
    target.searchParams.set("integration_error", reason);
    return target;
  };

  if (!tokenResponse.ok) {
    return redirectAndClear(request, errorUrl("token_exchange"));
  }

  const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokens.access_token) {
    return redirectAndClear(request, errorUrl("no_access_token"));
  }

  const tokenPayload: TokenPayload = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt:
      typeof tokens.expires_in === "number"
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
    scope: tokens.scope ?? null,
  };

  // Cada fluxo OAuth salva APENAS no provider iniciado (GA4 ≠ GOOGLE_ADS).
  if (provider === IntegrationProvider.GA4) {
    if (!hasGoogleAnalyticsScope(tokenPayload.scope)) {
      return redirectAndClear(request, errorUrl("ga4_scope_missing"));
    }
    await persistGa4Integration(context.clientId, tokenPayload);
  } else {
    if (!hasGoogleAdsScope(tokenPayload.scope)) {
      return redirectAndClear(request, errorUrl("google_ads_scope_missing"));
    }

    const adsResult = await persistGoogleAdsIntegration(
      context.clientId,
      tokenPayload,
    );

    if (!adsResult.ok) {
      return redirectAndClear(request, errorUrl(adsResult.reason));
    }
  }

  const successUrl = new URL(integrationsPath(context.clientId), request.url);
  successUrl.searchParams.set(
    "integration",
    `${provider.toLowerCase()}_connected`,
  );
  return redirectAndClear(request, successUrl);
}

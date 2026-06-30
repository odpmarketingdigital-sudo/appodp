import { NextResponse, type NextRequest } from "next/server";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { upsertIntegrationToken } from "@/lib/integrations/sync-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const META_TOKEN_ENDPOINT = "https://graph.facebook.com/v19.0/oauth/access_token";
const META_SCOPES = "ads_read,business_management";
const STATE_COOKIE = "meta_oauth_state";

type OAuthState = {
  state: string;
  clientId: string;
  provider: string;
};

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

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
function redirectAndClear(target: URL): NextResponse {
  const response = NextResponse.redirect(target);
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
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

  if (oauthError || !code || !stateParam || !context) {
    const target = context
      ? new URL(`/dashboard/clients/${context.clientId}`, request.url)
      : clientsUrl;
    target.searchParams.set("integration_error", "meta_oauth");
    return redirectAndClear(target);
  }

  // Proteção contra CSRF: o state retornado deve bater com o do cookie.
  if (stateParam !== context.state) {
    const target = new URL(`/dashboard/clients/${context.clientId}`, request.url);
    target.searchParams.set("integration_error", "state_mismatch");
    return redirectAndClear(target);
  }

  if (context.provider !== IntegrationProvider.META_ADS) {
    clientsUrl.searchParams.set("integration_error", "invalid_provider");
    return redirectAndClear(clientsUrl);
  }

  const metaClientId = process.env.META_CLIENT_ID;
  const metaClientSecret = process.env.META_CLIENT_SECRET;
  if (!metaClientId || !metaClientSecret) {
    const target = new URL(`/dashboard/clients/${context.clientId}`, request.url);
    target.searchParams.set("integration_error", "missing_credentials");
    return redirectAndClear(target);
  }

  // Isolamento multi-tenant: confirma que o cliente é da empresa do usuário.
  const membership = await getCurrentMembership(session.user.id);
  const client = membership
    ? await prisma.client.findFirst({
        where: { id: context.clientId, companyId: membership.company.id },
        select: { id: true },
      })
    : null;

  if (!client) {
    clientsUrl.searchParams.set("integration_error", "forbidden");
    return redirectAndClear(clientsUrl);
  }

  const errorUrl = (reason: string): URL => {
    const target = new URL(`/dashboard/clients/${context.clientId}`, request.url);
    target.searchParams.set("integration_error", reason);
    return target;
  };

  const redirectUri = new URL(
    "/api/integrations/meta/callback",
    request.url,
  ).toString();

  // 1) Troca do código pelo Short-Lived Token.
  const shortLivedUrl = new URL(META_TOKEN_ENDPOINT);
  shortLivedUrl.searchParams.set("client_id", metaClientId);
  shortLivedUrl.searchParams.set("client_secret", metaClientSecret);
  shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
  shortLivedUrl.searchParams.set("code", code);

  const shortLivedResponse = await fetch(shortLivedUrl.toString());
  if (!shortLivedResponse.ok) {
    return redirectAndClear(errorUrl("token_exchange"));
  }

  const shortLived = (await shortLivedResponse.json()) as MetaTokenResponse;
  if (!shortLived.access_token) {
    return redirectAndClear(errorUrl("no_access_token"));
  }

  // 2) Converte o Short-Lived em Long-Lived Token (~60 dias).
  const longLivedUrl = new URL(META_TOKEN_ENDPOINT);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", metaClientId);
  longLivedUrl.searchParams.set("client_secret", metaClientSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

  const longLivedResponse = await fetch(longLivedUrl.toString());
  if (!longLivedResponse.ok) {
    return redirectAndClear(errorUrl("token_exchange"));
  }

  const longLived = (await longLivedResponse.json()) as MetaTokenResponse;
  if (!longLived.access_token) {
    return redirectAndClear(errorUrl("no_access_token"));
  }

  const expiresAt =
    typeof longLived.expires_in === "number"
      ? new Date(Date.now() + longLived.expires_in * 1000)
      : null;

  // Meta não usa refresh token; o long-lived token é o mecanismo de duração.
  await upsertIntegrationToken({
    clientId: context.clientId,
    provider: IntegrationProvider.META_ADS,
    accessToken: longLived.access_token,
    refreshToken: null,
    expiresAt,
    scope: META_SCOPES,
  });

  const successUrl = new URL(`/dashboard/clients/${context.clientId}`, request.url);
  successUrl.searchParams.set("integration", "meta_ads_connected");
  return redirectAndClear(successUrl);
}

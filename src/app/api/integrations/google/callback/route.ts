import { NextResponse, type NextRequest } from "next/server";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
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
      return { state: parsed.state, clientId: parsed.clientId, provider: parsed.provider };
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

  // Falha de consentimento ou cookie/estado ausente.
  if (oauthError || !code || !stateParam || !context) {
    const target = context
      ? new URL(`/dashboard/clients/${context.clientId}`, request.url)
      : clientsUrl;
    target.searchParams.set("integration_error", "google_oauth");
    return redirectAndClear(request, target);
  }

  // Proteção contra CSRF: o state retornado deve bater com o do cookie.
  if (stateParam !== context.state) {
    const target = new URL(`/dashboard/clients/${context.clientId}`, request.url);
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
    const target = new URL(`/dashboard/clients/${context.clientId}`, request.url);
    target.searchParams.set("integration_error", "missing_credentials");
    return redirectAndClear(request, target);
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
    return redirectAndClear(request, clientsUrl);
  }

  const redirectUri = new URL(
    "/api/integrations/google/callback",
    request.url,
  ).toString();

  // Troca do código de autorização pelo token definitivo.
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

  if (!tokenResponse.ok) {
    const target = new URL(`/dashboard/clients/${context.clientId}`, request.url);
    target.searchParams.set("integration_error", "token_exchange");
    return redirectAndClear(request, target);
  }

  const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokens.access_token) {
    const target = new URL(`/dashboard/clients/${context.clientId}`, request.url);
    target.searchParams.set("integration_error", "no_access_token");
    return redirectAndClear(request, target);
  }

  const expiresAt =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

  await upsertIntegrationToken({
    clientId: context.clientId,
    provider,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt,
    scope: tokens.scope ?? null,
  });

  const successUrl = new URL(`/dashboard/clients/${context.clientId}`, request.url);
  successUrl.searchParams.set("integration", `${provider.toLowerCase()}_connected`);
  return redirectAndClear(request, successUrl);
}

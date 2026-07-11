import { NextResponse, type NextRequest } from "next/server";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { exchangeMetaCodeForLongLivedToken } from "@/lib/integrations/meta-oauth";
import { decodeMetaOAuthState } from "@/lib/integrations/meta-oauth-state";
import { upsertIntegrationToken } from "@/lib/integrations/sync-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const META_SCOPES = "ads_read,business_management";
const NONCE_COOKIE = "meta_oauth_nonce";

function redirectAndClearNonce(target: URL): NextResponse {
  const response = NextResponse.redirect(target);
  response.cookies.set(NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const stateParam = params.get("state");
  const oauthError = params.get("error");
  const nonceCookie = request.cookies.get(NONCE_COOKIE)?.value;

  const clientsUrl = new URL("/dashboard/clients", request.url);
  const oauthState = decodeMetaOAuthState(stateParam);

  const integrationsPath = (clientId: string) =>
    `/dashboard/clients/${clientId}/integrations`;

  const errorUrl = (clientId: string | null, reason: string): URL => {
    const target = clientId
      ? new URL(integrationsPath(clientId), request.url)
      : clientsUrl;
    target.searchParams.set("integration_error", reason);
    return target;
  };

  if (oauthError || !code || !stateParam || !oauthState) {
    return redirectAndClearNonce(
      errorUrl(oauthState?.clientId ?? null, "meta_oauth"),
    );
  }

  if (!nonceCookie || nonceCookie !== oauthState.nonce) {
    return redirectAndClearNonce(
      errorUrl(oauthState.clientId, "state_mismatch"),
    );
  }

  const membership = await getCurrentMembership(session.user.id);
  const client = membership
    ? await prisma.client.findFirst({
        where: {
          id: oauthState.clientId,
          companyId: membership.company.id,
        },
        select: { id: true },
      })
    : null;

  if (!client) {
    clientsUrl.searchParams.set("integration_error", "forbidden");
    return redirectAndClearNonce(clientsUrl);
  }

  const redirectUri = new URL(
    "/api/integrations/meta/callback",
    request.url,
  ).toString();

  const tokenResult = await exchangeMetaCodeForLongLivedToken(code, redirectUri);
  if (!tokenResult.ok) {
    return redirectAndClearNonce(
      errorUrl(oauthState.clientId, tokenResult.reason),
    );
  }

  await upsertIntegrationToken({
    clientId: oauthState.clientId,
    provider: IntegrationProvider.META_ADS,
    accessToken: tokenResult.accessToken,
    refreshToken: null,
    expiresAt: tokenResult.expiresAt,
    scope: META_SCOPES,
  });

  const successUrl = new URL(integrationsPath(oauthState.clientId), request.url);
  successUrl.searchParams.set("integration", "meta_ads_connected");
  return redirectAndClearNonce(successUrl);
}

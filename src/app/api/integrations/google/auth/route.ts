import { NextResponse, type NextRequest } from "next/server";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { GOOGLE_INTEGRATION_SCOPES } from "@/lib/integrations/google-ads-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

type GoogleProvider =
  | typeof IntegrationProvider.GA4
  | typeof IntegrationProvider.GOOGLE_ADS;

function parseGoogleProvider(value: string | null): GoogleProvider | null {
  if (
    value === IntegrationProvider.GA4 ||
    value === IntegrationProvider.GOOGLE_ADS
  ) {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID não configurado no ambiente." },
      { status: 500 },
    );
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  const provider = parseGoogleProvider(
    request.nextUrl.searchParams.get("provider"),
  );

  if (!clientId || !provider) {
    return NextResponse.json(
      { error: "Parâmetros inválidos (clientId/provider)." },
      { status: 400 },
    );
  }

  // Isolamento multi-tenant: o cliente precisa pertencer à empresa do usuário.
  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.redirect(new URL("/dashboard/clients", request.url));
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: membership.company.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json(
      { error: "Cliente não encontrado ou sem acesso." },
      { status: 403 },
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = new URL(
    "/api/integrations/google/callback",
    request.url,
  ).toString();

  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
  authUrl.searchParams.set("client_id", googleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_INTEGRATION_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  // Contexto do fluxo guardado em cookie httpOnly, validado no callback.
  response.cookies.set(
    "google_oauth_state",
    JSON.stringify({ state, clientId, provider }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  );

  return response;
}

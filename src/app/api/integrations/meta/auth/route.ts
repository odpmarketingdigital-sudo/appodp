import { NextResponse, type NextRequest } from "next/server";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const META_AUTH_ENDPOINT = "https://www.facebook.com/v19.0/dialog/oauth";

/** Escopos necessários para leitura de campanhas e gestão de negócios. */
const META_SCOPES = "ads_read,business_management";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const metaClientId = process.env.META_CLIENT_ID;
  if (!metaClientId) {
    return NextResponse.json(
      { error: "META_CLIENT_ID não configurado no ambiente." },
      { status: 500 },
    );
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: "Parâmetro inválido (clientId)." },
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
    "/api/integrations/meta/callback",
    request.url,
  ).toString();

  const authUrl = new URL(META_AUTH_ENDPOINT);
  authUrl.searchParams.set("client_id", metaClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", META_SCOPES);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());

  // Contexto do fluxo guardado em cookie httpOnly, validado no callback.
  response.cookies.set(
    "meta_oauth_state",
    JSON.stringify({
      state,
      clientId,
      provider: IntegrationProvider.META_ADS,
    }),
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

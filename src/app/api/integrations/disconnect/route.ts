import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DISCONNECTABLE_PROVIDERS = [
  IntegrationProvider.GA4,
  IntegrationProvider.GOOGLE_ADS,
  IntegrationProvider.META_ADS,
  IntegrationProvider.ACTIVECAMPAIGN,
] as const;

const disconnectSchema = z.object({
  clientId: z.string().min(1, "clientId é obrigatório."),
  provider: z.enum(DISCONNECTABLE_PROVIDERS),
});

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = disconnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos (clientId/provider)." },
      { status: 400 },
    );
  }

  const { clientId, provider } = parsed.data;

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "Nenhuma empresa associada ao usuário." },
      { status: 403 },
    );
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

  const existingToken = await prisma.integrationToken.findUnique({
    where: { clientId_provider: { clientId, provider } },
    select: { id: true },
  });

  if (!existingToken) {
    return NextResponse.json(
      { error: "Integração não encontrada para este cliente." },
      { status: 404 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.integrationToken.delete({
        where: { clientId_provider: { clientId, provider } },
      });

      if (provider === IntegrationProvider.GA4) {
        await tx.client.update({
          where: { id: clientId },
          data: { ga4PropertyId: null },
        });
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível desconectar a integração." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    provider,
    message: "Integração desconectada com sucesso.",
  });
}

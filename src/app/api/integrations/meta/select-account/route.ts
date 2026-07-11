import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { clientHasMetaToken } from "@/lib/client-meta";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  clientId: z.string().min(1, "Cliente inválido."),
  ad_account_id: z
    .string()
    .min(1, "Selecione uma conta de anúncios.")
    .regex(/^act_\d+$/, "ID da conta de anúncios inválido."),
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
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  const client = await prisma.client.findFirst({
    where: {
      id: parsed.data.clientId,
      companyId: membership.company.id,
    },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 403 });
  }

  const hasToken = await clientHasMetaToken(client.id, membership.company.id);
  if (!hasToken) {
    return NextResponse.json(
      { error: "Integração Meta não encontrada. Conecte a conta primeiro." },
      { status: 404 },
    );
  }

  try {
    await prisma.integrationToken.update({
      where: {
        clientId_provider: {
          clientId: client.id,
          provider: IntegrationProvider.META_ADS,
        },
      },
      data: {
        externalAccountId: parsed.data.ad_account_id,
        metadata: { adAccountId: parsed.data.ad_account_id },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar a conta de anúncios." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

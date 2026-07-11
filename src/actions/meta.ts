"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { clientHasMetaToken } from "@/lib/client-meta";
import { getMetaAdAccounts } from "@/lib/integrations/meta-api";
import { prisma } from "@/lib/prisma";

import type { MetaAdAccount } from "@/types/meta";

export type MetaAdAccountsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  accounts?: MetaAdAccount[];
};

async function requireClientAccess(clientId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada." as const };
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return { error: "Nenhuma empresa associada." as const };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: membership.company.id },
    select: { id: true },
  });

  if (!client) {
    return { error: "Cliente não encontrado." as const };
  }

  return { membership, clientId: client.id };
}

/** Lista contas de anúncios Meta disponíveis para o cliente. */
export async function listMetaAdAccountsAction(
  clientId: string,
): Promise<MetaAdAccountsActionState> {
  const ctx = await requireClientAccess(clientId);
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const hasToken = await clientHasMetaToken(
    ctx.clientId,
    ctx.membership.company.id,
  );
  if (!hasToken) {
    return {
      status: "error",
      message:
        "Nenhuma conta Meta conectada. Conecte o Meta Ads na seção de conexões abaixo.",
    };
  }

  const result = await getMetaAdAccounts(
    ctx.clientId,
    ctx.membership.company.id,
  );
  if (!result.ok) {
    return {
      status: "error",
      message: result.error,
      accounts: [],
    };
  }

  return {
    status: "success",
    accounts: result.accounts,
  };
}

const saveAdAccountSchema = z.object({
  clientId: z.string().min(1, "Cliente inválido."),
  adAccountId: z
    .string()
    .min(1, "Selecione uma conta de anúncios.")
    .regex(/^act_\d+$/, "ID da conta de anúncios inválido."),
});

export type MetaAdAccountFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: { adAccountId?: string };
};

/** Salva a conta de anúncios Meta no token de integração do cliente. */
export async function saveMetaAdAccountAction(
  _prevState: MetaAdAccountFormState,
  formData: FormData,
): Promise<MetaAdAccountFormState> {
  const parsed = saveAdAccountSchema.safeParse({
    clientId: formData.get("clientId"),
    adAccountId: formData.get("adAccountId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Selecione uma conta de anúncios válida.",
      fieldErrors: { adAccountId: "Conta obrigatória." },
    };
  }

  const ctx = await requireClientAccess(parsed.data.clientId);
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const hasToken = await clientHasMetaToken(
    ctx.clientId,
    ctx.membership.company.id,
  );
  if (!hasToken) {
    return {
      status: "error",
      message: "Conecte o Meta Ads antes de selecionar a conta de anúncios.",
    };
  }

  try {
    await prisma.integrationToken.update({
      where: {
        clientId_provider: {
          clientId: ctx.clientId,
          provider: IntegrationProvider.META_ADS,
        },
      },
      data: {
        externalAccountId: parsed.data.adAccountId,
        metadata: { adAccountId: parsed.data.adAccountId },
      },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar a conta. Tente novamente.",
    };
  }

  const base = `/dashboard/clients/${ctx.clientId}`;
  revalidatePath(base);
  revalidatePath(`${base}/integrations`);

  return {
    status: "success",
    message: "Conta de anúncios Meta salva com sucesso!",
  };
}

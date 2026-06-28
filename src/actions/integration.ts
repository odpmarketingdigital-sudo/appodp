"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";

export type IntegrationFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    accessToken?: string;
    externalAccountId?: string;
  };
};

const saveSchema = z.object({
  clientId: z.string().min(1),
  provider: z.enum(IntegrationProvider),
  accessToken: z.string().trim().min(1, "Informe o Access Token."),
  // ID externo é opcional (ex.: property ID do GA4, customer ID do Ads).
  externalAccountId: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(255).optional(),
  ),
});

/**
 * Cria ou atualiza (upsert) as credenciais de integração de um cliente.
 * Protegida por sessão e isolamento multi-tenant: garante que o cliente
 * pertence à empresa do usuário autenticado antes de gravar.
 */
export async function saveIntegrationTokenAction(
  _prevState: IntegrationFormState,
  formData: FormData,
): Promise<IntegrationFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const parsed = saveSchema.safeParse({
    clientId: formData.get("clientId"),
    provider: formData.get("provider"),
    accessToken: formData.get("accessToken"),
    externalAccountId: formData.get("externalAccountId"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<IntegrationFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "accessToken" || field === "externalAccountId") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors,
    };
  }

  const { clientId, provider, accessToken, externalAccountId } = parsed.data;

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return { status: "error", message: "Nenhuma empresa associada ao usuário." };
  }

  // Isolamento multi-tenant: o cliente precisa pertencer à empresa do usuário.
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: membership.company.id },
    select: { id: true },
  });

  if (!client) {
    return { status: "error", message: "Você não tem acesso a este cliente." };
  }

  try {
    await prisma.integrationToken.upsert({
      where: { clientId_provider: { clientId, provider } },
      create: {
        clientId,
        provider,
        accessToken,
        externalAccountId: externalAccountId ?? null,
        isActive: true,
      },
      update: {
        accessToken,
        externalAccountId: externalAccountId ?? null,
        isActive: true,
      },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar a integração. Tente novamente.",
    };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);

  return { status: "success", message: "Integração salva com sucesso." };
}

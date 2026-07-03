"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { parseActiveCampaignMetadata } from "@/lib/activecampaign-metadata";
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
  accessToken: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().optional(),
  ),
  // Identificador externo é opcional para a maioria dos provedores.
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

  const provider = formData.get("provider");
  const rawAccessToken =
    formData.get("accessToken") ?? formData.get("activeCampaignKey");
  const rawExternalAccountId =
    formData.get("externalAccountId") ?? formData.get("activeCampaignUrl");

  const parsed = saveSchema.safeParse({
    clientId: formData.get("clientId"),
    provider,
    accessToken: rawAccessToken,
    externalAccountId: rawExternalAccountId,
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

  const { clientId, provider: parsedProvider, accessToken, externalAccountId } =
    parsed.data;
  const fieldErrors: NonNullable<IntegrationFormState["fieldErrors"]> = {};

  if (!accessToken || accessToken.trim().length === 0) {
    fieldErrors.accessToken =
      parsedProvider === IntegrationProvider.ACTIVECAMPAIGN
        ? "Informe a Chave de API (Key)."
        : "Informe o token de acesso.";
  }

  if (
    parsedProvider === IntegrationProvider.ACTIVECAMPAIGN &&
    (!externalAccountId || externalAccountId.trim().length === 0)
  ) {
    fieldErrors.externalAccountId = "Informe a URL da API.";
  }

  if (fieldErrors.accessToken || fieldErrors.externalAccountId) {
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors,
    };
  }

  const providerToSave = parsedProvider;
  const accessTokenToSave = accessToken as string;

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
    const existingToken = await prisma.integrationToken.findUnique({
      where: { clientId_provider: { clientId, provider: providerToSave } },
      select: { metadata: true },
    });
    const preservedMetadata =
      providerToSave === IntegrationProvider.ACTIVECAMPAIGN
        ? parseActiveCampaignMetadata(existingToken?.metadata)
        : undefined;

    await prisma.integrationToken.upsert({
      where: { clientId_provider: { clientId, provider: providerToSave } },
      create: {
        clientId,
        provider: providerToSave,
        accessToken: accessTokenToSave,
        externalAccountId: externalAccountId ?? null,
        metadata:
          preservedMetadata && Object.keys(preservedMetadata).length > 0
            ? preservedMetadata
            : undefined,
        isActive: true,
      },
      update: {
        accessToken: accessTokenToSave,
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
  revalidatePath(`/dashboard/clients/${clientId}/integrations`);

  return { status: "success", message: "Integração salva com sucesso." };
}

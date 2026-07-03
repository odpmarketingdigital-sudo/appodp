"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { IntegrationProvider } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { parseActiveCampaignMetadata } from "@/lib/activecampaign-metadata";
import { getCurrentMembership } from "@/lib/company";
import { getClientActiveCampaignConnection } from "@/lib/client-activecampaign";
import { listPipelines } from "@/lib/integrations/activecampaign-api";
import { prisma } from "@/lib/prisma";

import type { AcPipelineOption } from "@/types/activecampaign";

export type ActiveCampaignPipelineFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  pipelines?: AcPipelineOption[];
  fieldErrors?: { pipelineId?: string };
};

const savePipelineSchema = z.object({
  clientId: z.string().min(1, "Cliente inválido."),
  pipelineId: z.string().min(1, "Selecione um funil."),
});

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

/** Lista funis disponíveis na conta ActiveCampaign conectada ao cliente. */
export async function listActiveCampaignPipelinesAction(
  clientId: string,
): Promise<ActiveCampaignPipelineFormState> {
  const ctx = await requireClientAccess(clientId);
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const connection = await getClientActiveCampaignConnection(
    ctx.clientId,
    ctx.membership.company.id,
  );
  if (!connection) {
    return {
      status: "error",
      message:
        "Conecte o ActiveCampaign informando a Chave de API e a URL da API.",
    };
  }

  try {
    const pipelines = await listPipelines(
      connection.apiBaseUrl,
      connection.apiToken,
    );
    return {
      status: "success",
      message:
        pipelines.length > 0
          ? `${pipelines.length} funil(is) encontrado(s).`
          : "Nenhum funil encontrado nesta conta.",
      pipelines,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar funis.";
    return { status: "error", message };
  }
}

/** Salva o funil selecionado no metadata do token ActiveCampaign. */
export async function saveActiveCampaignPipelineAction(
  _prevState: ActiveCampaignPipelineFormState,
  formData: FormData,
): Promise<ActiveCampaignPipelineFormState> {
  const parsed = savePipelineSchema.safeParse({
    clientId: formData.get("clientId"),
    pipelineId: formData.get("pipelineId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Selecione um funil válido.",
      fieldErrors: { pipelineId: "Funil obrigatório." },
    };
  }

  const ctx = await requireClientAccess(parsed.data.clientId);
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const token = await prisma.integrationToken.findUnique({
    where: {
      clientId_provider: {
        clientId: ctx.clientId,
        provider: IntegrationProvider.ACTIVECAMPAIGN,
      },
    },
    select: { id: true, metadata: true, isActive: true },
  });

  if (!token?.isActive) {
    return {
      status: "error",
      message: "Conecte o ActiveCampaign antes de selecionar o funil.",
    };
  }

  const currentMetadata = parseActiveCampaignMetadata(token.metadata);

  try {
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: {
        metadata: {
          ...currentMetadata,
          pipelineId: parsed.data.pipelineId,
        },
      },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar o funil. Tente novamente.",
    };
  }

  const base = `/dashboard/clients/${ctx.clientId}`;
  revalidatePath(base);
  revalidatePath(`${base}/integrations`);

  return {
    status: "success",
    message: "Funil salvo com sucesso!",
  };
}

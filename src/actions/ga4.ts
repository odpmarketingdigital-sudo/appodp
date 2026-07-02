"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { getClientGa4Connection } from "@/lib/client-ga4";
import { listGa4Properties } from "@/lib/integrations/ga4-api";
import { prisma } from "@/lib/prisma";

import type { GA4PropertyOption } from "@/types/ga4";

export type Ga4PropertyFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  properties?: GA4PropertyOption[];
  fieldErrors?: { propertyId?: string };
};

const savePropertySchema = z.object({
  clientId: z.string().min(1, "Cliente inválido."),
  propertyId: z.string().min(1, "Selecione uma propriedade."),
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

/**
 * Lista propriedades GA4 disponíveis na conta Google conectada ao cliente.
 */
export async function listGa4PropertiesAction(
  clientId: string,
): Promise<Ga4PropertyFormState> {
  const ctx = await requireClientAccess(clientId);
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const connection = await getClientGa4Connection(
    ctx.clientId,
    ctx.membership.company.id,
  );
  if (!connection) {
    return {
      status: "error",
      message:
        "Nenhuma conta GA4 conectada. Conecte o Google Analytics 4 abaixo.",
    };
  }

  try {
    const properties = await listGa4Properties(connection.accessToken);
    return {
      status: "success",
      message:
        properties.length > 0
          ? `${properties.length} propriedade(s) encontrada(s).`
          : "Nenhuma propriedade encontrada nesta conta.",
      properties,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar propriedades.";
    return { status: "error", message };
  }
}

/** Salva a propriedade GA4 monitorada no registro do cliente. */
export async function saveGa4PropertyAction(
  _prevState: Ga4PropertyFormState,
  formData: FormData,
): Promise<Ga4PropertyFormState> {
  const parsed = savePropertySchema.safeParse({
    clientId: formData.get("clientId"),
    propertyId: formData.get("propertyId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Selecione uma propriedade válida.",
      fieldErrors: { propertyId: "Propriedade obrigatória." },
    };
  }

  const ctx = await requireClientAccess(parsed.data.clientId);
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const connection = await getClientGa4Connection(
    ctx.clientId,
    ctx.membership.company.id,
  );
  if (!connection) {
    return {
      status: "error",
      message: "Conecte o GA4 antes de selecionar a propriedade.",
    };
  }

  const propertyId = parsed.data.propertyId.replace(/^properties\//, "");

  try {
    await prisma.client.update({
      where: { id: ctx.clientId },
      data: { ga4PropertyId: propertyId },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar a propriedade. Tente novamente.",
    };
  }

  const base = `/dashboard/clients/${ctx.clientId}`;
  revalidatePath(base);
  revalidatePath(`${base}/integrations`);
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Propriedade GA4 salva com sucesso!",
  };
}

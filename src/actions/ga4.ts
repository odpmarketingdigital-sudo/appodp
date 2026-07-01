"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { getCompanyGa4Connection } from "@/lib/company-ga4";
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
  propertyId: z.string().min(1, "Selecione uma propriedade."),
});

async function requireAdminMembership() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada." as const };
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return { error: "Nenhuma empresa associada." as const };
  }

  return { membership };
}

/**
 * Lista propriedades GA4 disponíveis na conta Google conectada à agência.
 */
export async function listGa4PropertiesAction(): Promise<Ga4PropertyFormState> {
  const ctx = await requireAdminMembership();
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const connection = await getCompanyGa4Connection(ctx.membership.company.id);
  if (!connection) {
    return {
      status: "error",
      message:
        "Nenhuma conta GA4 conectada. Conecte o GA4 em um cliente primeiro.",
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

/** Salva a propriedade GA4 monitorada no dashboard da agência. */
export async function saveGa4PropertyAction(
  _prevState: Ga4PropertyFormState,
  formData: FormData,
): Promise<Ga4PropertyFormState> {
  const ctx = await requireAdminMembership();
  if ("error" in ctx) {
    return { status: "error", message: ctx.error };
  }

  const parsed = savePropertySchema.safeParse({
    propertyId: formData.get("propertyId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Selecione uma propriedade válida.",
      fieldErrors: { propertyId: "Propriedade obrigatória." },
    };
  }

  const connection = await getCompanyGa4Connection(ctx.membership.company.id);
  if (!connection) {
    return {
      status: "error",
      message: "Conecte o GA4 em um cliente antes de selecionar a propriedade.",
    };
  }

  const propertyId = parsed.data.propertyId.replace(/^properties\//, "");

  try {
    await prisma.company.update({
      where: { id: ctx.membership.company.id },
      data: { ga4PropertyId: propertyId },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar a propriedade. Tente novamente.",
    };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Propriedade GA4 salva com sucesso!",
  };
}

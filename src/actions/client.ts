"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { getClientLimitState } from "@/lib/subscription";

export type ClientFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    name?: string;
    email?: string;
  };
};

const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  // E-mail é opcional: string vazia é tratada como ausência de e-mail.
  email: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.email("Informe um e-mail válido.").max(255).optional(),
  ),
});

function collectFieldErrors(
  error: z.ZodError,
): NonNullable<ClientFormState["fieldErrors"]> {
  const fieldErrors: NonNullable<ClientFormState["fieldErrors"]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "name" || field === "email") {
      fieldErrors[field] ??= issue.message;
    }
  }
  return fieldErrors;
}

/**
 * Cria um novo cliente vinculado à empresa atual do usuário autenticado.
 */
export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return { status: "error", message: "Nenhuma empresa associada ao usuário." };
  }

  // Trava de plano: agências gratuitas têm limite de clientes.
  const limitState = await getClientLimitState(membership.company.id);
  if (limitState.atLimit) {
    return {
      status: "error",
      message: `Limite de ${limitState.limit} cliente atingido no plano gratuito. Faça upgrade para o Premium para adicionar mais.`,
    };
  }

  const { name, email } = parsed.data;

  try {
    await prisma.client.create({
      data: {
        name,
        email: email ?? null,
        companyId: membership.company.id,
      },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível criar o cliente. Tente novamente.",
    };
  }

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

/**
 * Atualiza um cliente existente, garantindo que ele pertença à empresa
 * atual do usuário autenticado.
 */
export async function updateClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || clientId.length === 0) {
    return { status: "error", message: "Cliente inválido." };
  }

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return { status: "error", message: "Nenhuma empresa associada ao usuário." };
  }

  // Garante que o cliente pertence à empresa do usuário.
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { companyId: true },
  });

  if (!client || client.companyId !== membership.company.id) {
    return { status: "error", message: "Você não tem acesso a este cliente." };
  }

  const { name, email } = parsed.data;

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { name, email: email ?? null },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar as alterações. Tente novamente.",
    };
  }

  revalidatePath("/dashboard/clients");
  return { status: "success", message: "Cliente atualizado com sucesso." };
}

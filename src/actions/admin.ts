"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { isSystemAdmin } from "@/lib/admin";
import { isValidAdminPlanValue } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export type AdminUserFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    email?: string;
    companyName?: string;
    stripePriceId?: string;
  };
};

const updateUserSchema = z.object({
  userId: z.string().min(1, "Usuário inválido."),
  companyId: z.string().min(1, "Agência inválida."),
  email: z.email("Informe um e-mail válido.").max(255),
  companyName: z
    .string()
    .trim()
    .min(2, "Nome da agência deve ter ao menos 2 caracteres.")
    .max(100, "Nome da agência muito longo."),
  stripePriceId: z.string().min(1, "Selecione um plano."),
});

/**
 * Atualiza e-mail do usuário, plano (Subscription) e nome da agência.
 * Apenas administradores globais (`isSystemAdmin`) podem executar.
 */
export async function updateUserAdminAction(
  _prevState: AdminUserFormState,
  formData: FormData,
): Promise<AdminUserFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const actorIsAdmin = await isSystemAdmin(session.user.id);
  if (!actorIsAdmin) {
    return { status: "error", message: "Acesso negado. Apenas Super Admins." };
  }

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    companyId: formData.get("companyId"),
    email: formData.get("email"),
    companyName: formData.get("companyName"),
    stripePriceId: formData.get("stripePriceId"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<AdminUserFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        field === "email" ||
        field === "companyName" ||
        field === "stripePriceId"
      ) {
        fieldErrors[field] ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors,
    };
  }

  const { userId, companyId, email, companyName, stripePriceId } =
    parsed.data;

  if (!isValidAdminPlanValue(stripePriceId)) {
    return {
      status: "error",
      message: "Plano selecionado não é válido.",
      fieldErrors: { stripePriceId: "Plano inválido." },
    };
  }

  const emailNormalized = email.toLowerCase();

  const membership = await prisma.companyMember.findFirst({
    where: { userId, companyId },
    select: { id: true },
  });

  if (!membership) {
    return {
      status: "error",
      message: "Usuário não pertence à agência informada.",
    };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email: emailNormalized, NOT: { id: userId } },
    select: { id: true },
  });

  if (emailTaken) {
    return {
      status: "error",
      message: "Este e-mail já está em uso por outro usuário.",
      fieldErrors: { email: "E-mail já cadastrado." },
    };
  }

  const isFreePlan = stripePriceId === "free";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { email: emailNormalized },
      });

      await tx.company.update({
        where: { id: companyId },
        data: { name: companyName },
      });

      await tx.subscription.upsert({
        where: { companyId },
        create: {
          companyId,
          status: isFreePlan ? "free" : "active",
          stripePriceId: isFreePlan ? null : stripePriceId,
        },
        update: {
          status: isFreePlan ? "free" : "active",
          stripePriceId: isFreePlan ? null : stripePriceId,
        },
      });
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível atualizar o usuário. Tente novamente.",
    };
  }

  revalidatePath("/admin");

  return {
    status: "success",
    message: "Atualizado com sucesso!",
  };
}

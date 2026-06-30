"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CompanyRole } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";

export type TeamFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    email?: string;
    role?: string;
  };
};

const inviteSchema = z.object({
  email: z.email("Informe um e-mail válido.").max(255),
  role: z.enum([CompanyRole.ADMIN, CompanyRole.MEMBER]),
});

/**
 * Convida (ou vincula diretamente) um usuário à empresa atual com a role
 * escolhida. Apenas OWNER ou ADMIN podem convidar. Se ainda não existir um
 * usuário com o e-mail, ele é pré-criado para que, ao logar com o Google, já
 * caia na agência correta.
 */
export async function inviteMemberAction(
  _prevState: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<TeamFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "role") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors,
    };
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return { status: "error", message: "Nenhuma empresa associada ao usuário." };
  }

  if (
    membership.role !== CompanyRole.OWNER &&
    membership.role !== CompanyRole.ADMIN
  ) {
    return {
      status: "error",
      message: "Apenas administradores podem convidar membros.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const { role } = parsed.data;

  // Garante um usuário com esse e-mail (cria se ainda não existir).
  const user = await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  const existing = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: { userId: user.id, companyId: membership.company.id },
    },
    select: { id: true },
  });

  if (existing) {
    return {
      status: "error",
      message: "Este usuário já faz parte do time.",
      fieldErrors: { email: "Já é membro desta agência." },
    };
  }

  try {
    await prisma.companyMember.create({
      data: {
        userId: user.id,
        companyId: membership.company.id,
        role,
      },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível adicionar o membro. Tente novamente.",
    };
  }

  revalidatePath("/dashboard/team");
  return {
    status: "success",
    message: `${email} foi adicionado(a) ao time como ${role}.`,
  };
}

/**
 * Remove um membro do time. Apenas o OWNER pode remover, e não é permitido
 * remover a si mesmo nem outro OWNER.
 */
export async function removeMemberAction(
  _prevState: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const membershipId = String(formData.get("membershipId") ?? "");
  if (!membershipId) {
    return { status: "error", message: "Membro inválido." };
  }

  const actor = await getCurrentMembership(session.user.id);
  if (!actor) {
    return { status: "error", message: "Nenhuma empresa associada ao usuário." };
  }

  if (actor.role !== CompanyRole.OWNER) {
    return {
      status: "error",
      message: "Apenas o proprietário (OWNER) pode remover membros.",
    };
  }

  const target = await prisma.companyMember.findUnique({
    where: { id: membershipId },
    select: { id: true, companyId: true, role: true },
  });

  if (!target || target.companyId !== actor.company.id) {
    return { status: "error", message: "Membro não encontrado." };
  }

  if (target.id === actor.id) {
    return { status: "error", message: "Você não pode remover a si mesmo." };
  }

  if (target.role === CompanyRole.OWNER) {
    return { status: "error", message: "Não é possível remover um OWNER." };
  }

  try {
    await prisma.companyMember.delete({ where: { id: membershipId } });
  } catch {
    return {
      status: "error",
      message: "Não foi possível remover o membro. Tente novamente.",
    };
  }

  revalidatePath("/dashboard/team");
  return { status: "success", message: "Membro removido do time." };
}

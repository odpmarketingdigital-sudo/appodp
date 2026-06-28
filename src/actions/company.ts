"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CompanyRole } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CompanyFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: {
    name?: string;
    slug?: string;
  };
};

const updateCompanySchema = z.object({
  companyId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter ao menos 2 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "O slug deve ter ao menos 2 caracteres.")
    .max(40, "O slug deve ter no máximo 40 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens.",
    ),
});

const EDITABLE_ROLES: CompanyRole[] = [CompanyRole.OWNER, CompanyRole.ADMIN];

export async function updateCompanyAction(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  // 1. Autenticação
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  // 2. Validação dos campos
  const parsed = updateCompanySchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<CompanyFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "name" || field === "slug") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors,
    };
  }

  const { companyId, name, slug } = parsed.data;

  // 3. Autorização: o usuário precisa ser membro com papel OWNER ou ADMIN
  const membership = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId: session.user.id, companyId } },
    select: { role: true },
  });

  if (!membership) {
    return { status: "error", message: "Você não tem acesso a esta empresa." };
  }

  if (!EDITABLE_ROLES.includes(membership.role)) {
    return {
      status: "error",
      message: "Você não tem permissão para editar esta empresa.",
    };
  }

  // 4. Slug único (ignorando a própria empresa)
  const slugOwner = await prisma.company.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (slugOwner && slugOwner.id !== companyId) {
    return {
      status: "error",
      message: "Não foi possível salvar.",
      fieldErrors: { slug: "Este slug já está em uso." },
    };
  }

  // 5. Persistência
  try {
    await prisma.company.update({
      where: { id: companyId },
      data: { name, slug },
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível salvar as alterações. Tente novamente.",
    };
  }

  revalidatePath("/dashboard/settings");

  return { status: "success", message: "Empresa atualizada com sucesso." };
}

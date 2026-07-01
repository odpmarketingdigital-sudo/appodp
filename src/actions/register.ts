"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ensureUserHasCompany } from "@/lib/first-access";

export type RegisterFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: {
    name?: string;
    email?: string;
    password?: string;
  };
};

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres.")
    .max(100, "Nome muito longo."),
  email: z.email("Informe um e-mail válido.").max(255),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(128, "Senha muito longa."),
});

/**
 * Cadastra um novo usuário com e-mail e senha, cria a agência padrão (OWNER)
 * e redireciona para a tela de login.
 */
export async function registerUserAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<RegisterFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "name" || field === "email" || field === "password") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase();
  const { name, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return {
      status: "error",
      message: "E-mail já cadastrado.",
      fieldErrors: { email: "Este e-mail já está em uso." },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: { id: true, name: true, email: true },
    });

    await ensureUserHasCompany({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch {
    return {
      status: "error",
      message: "Não foi possível criar a conta. Tente novamente.",
    };
  }

  redirect("/login?registered=1");
}

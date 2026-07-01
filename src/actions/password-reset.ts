"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

export type PasswordResetFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Apenas em desenvolvimento: link direto para testar sem serviço de e-mail. */
  devResetUrl?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    token?: string;
  };
};

const requestSchema = z.object({
  email: z.email("Informe um e-mail válido."),
});

const resetSchema = z
  .object({
    token: z.string().min(1, "Token inválido."),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(128, "Senha muito longa."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

function getAppBaseUrl(): string {
  return process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

/**
 * Gera um token de redefinição de senha e persiste no banco.
 * Por segurança, sempre retorna mensagem genérica de sucesso.
 */
export async function requestPasswordResetAction(
  _prevState: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const parsed = requestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<PasswordResetFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email") {
        fieldErrors.email ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Verifique o e-mail informado.",
      fieldErrors,
    };
  }

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // Só gera token se o usuário existir e tiver senha (conta credentials).
  if (user?.passwordHash) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({
      data: { email, token, expires },
    });

    const resetUrl = `${getAppBaseUrl()}/reset-password?token=${token}`;

    if (process.env.NODE_ENV === "development") {
      console.info(`[password-reset] Link de redefinição: ${resetUrl}`);
      return {
        status: "success",
        message:
          "Se o e-mail estiver cadastrado, você receberá instruções em breve.",
        devResetUrl: resetUrl,
      };
    }

    // TODO: integrar serviço de e-mail (Resend, etc.) em produção.
    console.info(
      `[password-reset] Token gerado para ${email} (envio de e-mail pendente).`,
    );
  }

  return {
    status: "success",
    message:
      "Se o e-mail estiver cadastrado, você receberá instruções em breve.",
  };
}

/**
 * Valida o token, verifica expiração e salva a nova senha com bcrypt.
 */
export async function resetPasswordAction(
  _prevState: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<PasswordResetFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        field === "password" ||
        field === "confirmPassword" ||
        field === "token"
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

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expires < new Date()) {
    if (resetToken) {
      await prisma.passwordResetToken.delete({ where: { token } });
    }
    return {
      status: "error",
      message: "Link inválido ou expirado. Solicite uma nova redefinição.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({ where: { token } }),
    ]);
  } catch {
    return {
      status: "error",
      message: "Não foi possível redefinir a senha. Tente novamente.",
    };
  }

  redirect("/login?reset=1");
}

/** Valida se um token de redefinição ainda é válido (para a página de reset). */
export async function isPasswordResetTokenValid(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { expires: true },
  });

  if (!resetToken) return false;
  if (resetToken.expires < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } });
    return false;
  }

  return true;
}

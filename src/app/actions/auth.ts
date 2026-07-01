"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { signIn, signOut } from "@/auth";

export type AuthFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
};

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

/**
 * Inicia o login com Google. Após o callback (e a criação automática da
 * Company no primeiro acesso), o usuário é redirecionado para /dashboard.
 */
export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

/**
 * Login por e-mail e senha via Credentials provider do Auth.js.
 */
export async function loginWithCredentialsAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<AuthFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "password") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;

    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          status: "error",
          message: "E-mail ou senha incorretos.",
        };
      }
      return {
        status: "error",
        message: "Não foi possível entrar. Tente novamente.",
      };
    }

    throw error;
  }

  return { status: "idle" };
}

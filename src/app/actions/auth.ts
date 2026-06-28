"use server";

import { signIn, signOut } from "@/auth";

/**
 * Inicia o login com Google. Após o callback (e a criação automática da
 * Company no primeiro acesso), o usuário é redirecionado para /dashboard.
 */
export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

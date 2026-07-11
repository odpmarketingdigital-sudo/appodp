import { auth } from "@/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve o ID do usuário autenticado.
 * Prioriza Supabase Auth; se não houver sessão Supabase, usa Auth.js (NextAuth).
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      return user.id;
    }
  } catch {
    // Variáveis Supabase ausentes — segue para o fallback Auth.js.
  }

  const session = await auth();
  return session?.user?.id ?? null;
}

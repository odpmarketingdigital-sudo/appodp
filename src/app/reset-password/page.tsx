import Link from "next/link";

import { isPasswordResetTokenValid } from "@/actions/password-reset";
import { ResetPasswordForm } from "@/components/reset-password-form";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = firstParam((await searchParams).token);
  const valid = await isPasswordResetTokenValid(token);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Nova senha
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Escolha uma nova senha para sua conta.
          </p>
        </header>

        {valid && token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4 text-center">
            <div
              role="alert"
              className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              Link inválido ou expirado. Solicite uma nova redefinição de senha.
            </div>
            <Link
              href="/forgot-password"
              className="inline-block text-sm font-medium text-zinc-200 underline underline-offset-2 hover:text-white"
            >
              Solicitar novo link
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CredentialsLoginForm } from "@/components/credentials-login-form";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const registered = firstParam((await searchParams).registered);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            AppODP
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Entre com seu e-mail ou continue com o Google.
          </p>
        </header>

        {registered === "1" && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            Conta criada com sucesso! Faça login para continuar.
          </div>
        )}

        <CredentialsLoginForm />
      </div>
    </main>
  );
}

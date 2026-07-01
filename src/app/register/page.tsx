import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Criar conta
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Cadastre-se para começar a usar o AppODP.
          </p>
        </header>

        <RegisterForm />
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginButton } from "@/components/login-button";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          AppODP
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Faça login para acessar o painel.
        </p>

        <div className="mt-8 flex justify-center">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}

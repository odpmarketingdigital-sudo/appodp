import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ClientForm } from "@/components/client-form";

export default async function NewClientPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Novo cliente
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cadastre um novo cliente da sua empresa.
          </p>
        </header>

        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <ClientForm />
        </section>
      </div>
    </main>
  );
}

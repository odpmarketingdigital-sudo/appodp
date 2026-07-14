import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { getClientLimitState } from "@/lib/subscription";

export default async function ClientsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const membership = await getCurrentMembership(session.user.id);

  const clients = membership
    ? await prisma.client.findMany({
        where: { companyId: membership.company.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const limitState = membership
    ? await getClientLimitState(membership.company.id)
    : null;
  const atLimit = limitState?.atLimit ?? false;

  return (
    <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              Clientes
            </h1>
            {atLimit ? (
              <span
                aria-disabled
                title="Limite do plano atingido"
                className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full bg-zinc-300 px-4 py-2 text-sm font-medium text-zinc-500 sm:w-auto dark:bg-zinc-800 dark:text-zinc-500"
              >
                Novo cliente
              </span>
            ) : (
              <Link
                href="/dashboard/clients/new"
                className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 sm:w-auto dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Novo cliente
              </Link>
            )}
          </div>
        </header>

        {atLimit && (
          <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-300">
            Você atingiu o limite de {limitState?.limit} cliente
            {limitState?.limit === 1 ? "" : "s"} do plano{" "}
            {limitState?.planName}.{" "}
            <Link
              href="/dashboard/settings"
              className="font-semibold underline underline-offset-2 hover:text-violet-200"
            >
              Ver planos disponíveis
            </Link>{" "}
            para adicionar mais clientes.
          </div>
        )}

        <section className="rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
          {clients.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum cliente cadastrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {clients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-black/[.03] sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:hover:bg-white/[.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {client.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {client.email ?? "Sem e-mail"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {client.createdAt.toLocaleDateString("pt-BR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

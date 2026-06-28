import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";

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

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Clientes
            </h1>
            <Link
              href="/dashboard/clients/new"
              className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Novo cliente
            </Link>
          </div>
        </header>

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
                    className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-black/[.03] dark:hover:bg-white/[.03]"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {client.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {client.email ?? "Sem e-mail"}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-400">
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

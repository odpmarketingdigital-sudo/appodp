import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isSystemAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const STRIPE_STATUS_LABELS: Record<string, string> = {
  free: "Gratuito",
  active: "Premium",
  past_due: "Inadimplente",
  canceled: "Cancelado",
};

function stripeBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    case "past_due":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "canceled":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-700 bg-zinc-800/60 text-zinc-300";
  }
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const admin = await isSystemAdmin(session.user.id);
  if (!admin) {
    redirect("/dashboard");
  }

  const [totalUsers, totalCompanies, users] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isSystemAdmin: true,
        memberships: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            company: {
              select: {
                name: true,
                subscription: { select: { status: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Visão global do sistema
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Métricas e usuários cadastrados em todas as agências.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">Total de usuários</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-50">
            {totalUsers}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">Total de agências</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-50">
            {totalCompanies}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            Usuários cadastrados
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Agência</th>
                <th className="px-5 py-3 font-medium">Stripe</th>
                <th className="px-5 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((user) => {
                const company = user.memberships[0]?.company;
                const stripeStatus = company?.subscription?.status ?? "free";

                return (
                  <tr key={user.id} className="hover:bg-zinc-900/30">
                    <td className="px-5 py-3 text-zinc-100">
                      {user.name ?? "—"}
                      {user.isSystemAdmin && (
                        <span className="ml-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-400">
                      {user.email ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-300">
                      {company?.name ?? "Sem agência"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${stripeBadgeClass(stripeStatus)}`}
                      >
                        {STRIPE_STATUS_LABELS[stripeStatus] ?? stripeStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">
                      {user.createdAt.toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

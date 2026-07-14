import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  AdminUsersTable,
  type AdminUserRow,
} from "@/components/admin-users-table";
import { isSystemAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const admin = await isSystemAdmin(session.user.id);
  if (!admin) {
    redirect("/dashboard");
  }

  const [totalUsers, totalCompanies, usersRaw] = await Promise.all([
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
                id: true,
                name: true,
                subscription: { select: { status: true, stripePriceId: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const users: AdminUserRow[] = usersRaw.map((user) => {
    const company = user.memberships[0]?.company;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isSystemAdmin: user.isSystemAdmin,
      createdAt: user.createdAt.toISOString(),
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      subscriptionStatus: company?.subscription?.status ?? "free",
      stripePriceId: company?.subscription?.stripePriceId ?? null,
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          Visão global do sistema
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Métricas e usuários cadastrados em todas as agências.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <p className="text-sm text-zinc-400">Total de usuários</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-50 sm:text-3xl">
            {totalUsers}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
          <p className="text-sm text-zinc-400">Total de agências</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-50 sm:text-3xl">
            {totalCompanies}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="border-b border-zinc-800 px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold text-zinc-100">
            Usuários cadastrados
          </h2>
        </div>
        <AdminUsersTable users={users} />
      </section>
    </div>
  );
}

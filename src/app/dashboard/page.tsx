import {
  MousePointerClick,
  Plug,
  TrendingUp,
  Users,
} from "lucide-react";

import { auth } from "@/auth";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const membership = session?.user?.id
    ? await getCurrentMembership(session.user.id)
    : null;

  // Total de Clientes é real; as demais métricas são mockadas por enquanto.
  const totalClients = membership
    ? await prisma.client.count({
        where: { companyId: membership.company.id },
      })
    : 0;

  const metrics = [
    {
      label: "Total de Clientes",
      value: totalClients.toLocaleString("pt-BR"),
      hint: "clientes cadastrados",
      icon: Users,
    },
    {
      label: "Integrações Ativas",
      value: "3",
      hint: "conectadas",
      icon: Plug,
    },
    {
      label: "Cliques no mês",
      value: "1.248",
      hint: "+12% vs. mês anterior",
      icon: MousePointerClick,
    },
    {
      label: "Conversões",
      value: "86",
      hint: "este mês",
      icon: TrendingUp,
    },
  ];

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-5xl">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Visão Geral
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Resumo da atividade da sua agência.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({ label, value, hint, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">{label}</span>
                <Icon className="h-5 w-5 text-zinc-500" aria-hidden="true" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-zinc-100">
                {value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{hint}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

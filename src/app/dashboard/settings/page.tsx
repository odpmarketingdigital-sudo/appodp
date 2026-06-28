import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CompanyForm } from "@/components/company-form";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  // Empresa atual do usuário (primeira pela ordem de criação).
  const membership = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Configurações da empresa
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Atualize os dados da sua agência.
          </p>
        </header>

        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          {membership ? (
            <CompanyForm
              company={{
                id: membership.company.id,
                name: membership.company.name,
                slug: membership.company.slug,
              }}
            />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhuma empresa encontrada para o seu usuário.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

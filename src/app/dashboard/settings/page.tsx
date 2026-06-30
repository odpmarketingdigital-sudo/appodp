import { Lock } from "lucide-react";
import { redirect } from "next/navigation";

import { CompanyRole } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { CompanyForm } from "@/components/company-form";
import { UpgradeButton } from "@/components/upgrade-button";
import { prisma } from "@/lib/prisma";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const checkout = firstParam((await searchParams).checkout);

  // Empresa atual do usuário (primeira pela ordem de criação).
  const membership = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });

  // Área financeira: membros comuns (MEMBER) não têm acesso.
  if (membership?.role === CompanyRole.MEMBER) {
    return (
      <main className="flex-1 p-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-black/5 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Lock
              className="h-6 w-6 text-zinc-500 dark:text-zinc-400"
              aria-hidden
            />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Acesso negado
          </h1>
          <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            A área de configurações e faturamento é restrita a administradores e
            ao proprietário da agência. Fale com o responsável pela conta caso
            precise de acesso.
          </p>
        </div>
      </main>
    );
  }

  const subscription = membership
    ? await prisma.subscription.findUnique({
        where: { companyId: membership.company.id },
      })
    : null;

  const isPremium = subscription?.status === "active";

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

        {checkout === "success" && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            <p className="font-medium">Pagamento confirmado!</p>
            <p className="mt-0.5 text-emerald-300/90">
              Seu plano será atualizado em instantes assim que o Stripe
              confirmar a assinatura.
            </p>
          </div>
        )}

        {checkout === "cancel" && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-zinc-700 bg-zinc-800/40 px-4 py-3 text-sm text-zinc-300"
          >
            Checkout cancelado. Você pode tentar novamente quando quiser.
          </div>
        )}

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

        <section className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Plano e faturamento
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Plano atual:{" "}
                <span
                  className={
                    isPremium
                      ? "font-semibold text-violet-500 dark:text-violet-400"
                      : "font-semibold text-zinc-700 dark:text-zinc-200"
                  }
                >
                  {isPremium ? "Premium" : "Gratuito"}
                </span>
              </p>
              {isPremium && subscription?.currentPeriodEnd && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Renova em{" "}
                  {subscription.currentPeriodEnd.toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>

            {!isPremium && <UpgradeButton />}
          </div>

          {!isPremium && (
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Desbloqueie sincronização ilimitada e recursos avançados com o
              plano Premium.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

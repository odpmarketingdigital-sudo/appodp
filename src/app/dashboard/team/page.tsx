import { redirect } from "next/navigation";

import { CompanyRole } from "@/app/generated/prisma";
import { auth } from "@/auth";
import { InviteMemberForm } from "@/components/invite-member-form";
import { RemoveMemberButton } from "@/components/remove-member-button";
import { getCurrentMembership } from "@/lib/company";
import { prisma } from "@/lib/prisma";

const ROLE_LABELS: Record<CompanyRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
};

const ROLE_BADGE: Record<CompanyRole, string> = {
  OWNER:
    "border-violet-500/30 bg-violet-500/10 text-violet-300",
  ADMIN: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  MEMBER: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
};

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const chars = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return chars.toUpperCase();
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const membership = await getCurrentMembership(session.user.id);
  if (!membership) {
    return (
      <main className="flex-1 p-6">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nenhuma empresa associada ao seu usuário.
          </p>
        </div>
      </main>
    );
  }

  const isOwner = membership.role === CompanyRole.OWNER;
  const canManage =
    membership.role === CompanyRole.OWNER ||
    membership.role === CompanyRole.ADMIN;

  const members = await prisma.companyMember.findMany({
    where: { companyId: membership.company.id },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return (
    <main className="flex-1 p-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Time
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie quem tem acesso à agência{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {membership.company.name}
            </span>
            .
          </p>
        </header>

        {canManage && (
          <section className="mb-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Convidar novo membro
            </h2>
            <InviteMemberForm />
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {members.map((member) => {
              const isSelf = member.userId === session.user!.id;
              const canRemove =
                isOwner && !isSelf && member.role !== CompanyRole.OWNER;

              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {initials(member.user.name, member.user.email)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {member.user.name ?? member.user.email ?? "Sem nome"}
                        {isSelf && (
                          <span className="ml-2 text-xs font-normal text-zinc-400">
                            (você)
                          </span>
                        )}
                      </p>
                      {member.user.email && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {member.user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[member.role]}`}
                    >
                      {ROLE_LABELS[member.role]}
                    </span>
                    {canRemove && (
                      <RemoveMemberButton membershipId={member.id} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}

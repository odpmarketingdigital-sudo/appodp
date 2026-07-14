import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isSystemAdmin } from "@/lib/admin";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const admin = await isSystemAdmin(session.user.id);
  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-violet-300">
              God Mode
            </span>
            <span className="text-base font-semibold tracking-tight sm:text-lg">
              Super Admin
            </span>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            ← Voltar ao painel
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

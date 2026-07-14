import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentMembership } from "@/lib/company";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const membership = await getCurrentMembership(session.user.id);
  const agencyName = membership?.company.name ?? "Minha Empresa";

  return <DashboardShell agencyName={agencyName}>{children}</DashboardShell>;
}

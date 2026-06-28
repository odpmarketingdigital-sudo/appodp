import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
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

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar agencyName={agencyName} />
        {children}
      </div>
    </div>
  );
}

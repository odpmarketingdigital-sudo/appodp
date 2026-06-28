import { Building2 } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";

type NavbarProps = {
  agencyName: string;
};

export function Navbar({ agencyName }: NavbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs text-zinc-500">Agência atual</p>
          <p className="text-sm font-medium text-zinc-100">{agencyName}</p>
        </div>
      </div>

      <LogoutButton />
    </header>
  );
}

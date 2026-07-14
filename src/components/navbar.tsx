"use client";

import { Building2, Menu, X } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";

type NavbarProps = {
  agencyName: string;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
};

export function Navbar({ agencyName, onMenuToggle, menuOpen = false }: NavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 sm:h-16 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 lg:hidden"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 sm:flex">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0">
          <p className="text-xs text-zinc-500">Agência atual</p>
          <p className="truncate text-sm font-medium text-zinc-100">{agencyName}</p>
        </div>
      </div>

      <div className="shrink-0">
        <LogoutButton />
      </div>
    </header>
  );
}

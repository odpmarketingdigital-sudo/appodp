"use client";

import { useCallback, useEffect, useState } from "react";

import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

type DashboardShellProps = {
  agencyName: string;
  children: React.ReactNode;
};

export function DashboardShell({ agencyName, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <Sidebar mobileOpen={mobileOpen} onNavigate={closeMobile} />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          agencyName={agencyName}
          menuOpen={mobileOpen}
          onMenuToggle={() => setMobileOpen((open) => !open)}
        />
        <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}

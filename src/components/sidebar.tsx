"use client";

import clsx from "clsx";
import { LayoutDashboard, Settings, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { BrandLogo } from "@/components/brand-logo";

const NAV_LINKS = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/clients", label: "Clientes", icon: Users, exact: false },
  { href: "/dashboard/team", label: "Time", icon: UsersRound, exact: false },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings, exact: false },
] as const;

type SidebarContentProps = {
  onNavigate?: () => void;
};

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-14 shrink-0 items-center px-4 sm:h-16 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center"
          onClick={onNavigate}
        >
          <BrandLogo className="h-8 w-auto" priority />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

type SidebarProps = {
  mobileOpen?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ mobileOpen = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      onNavigate?.();
    }
  }, [pathname, onNavigate]);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
        <SidebarContent />
      </aside>

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,16rem)] flex-col border-r border-zinc-800 bg-zinc-950 shadow-xl transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
      >
        <SidebarContent onNavigate={onNavigate} />
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type IntegrationEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

/** Placeholder elegante para abas de integração ainda não implementadas. */
export function IntegrationEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: IntegrationEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center sm:px-8 sm:py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <Icon className="h-7 w-7 text-zinc-500" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">{description}</p>
      {actionLabel &&
        (actionHref ? (
          <Link
            href={actionHref}
            className="mt-6 inline-flex rounded-full border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
          >
            {actionLabel}
          </Link>
        ) : (
          <span className="mt-6 inline-flex rounded-full border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-400">
            {actionLabel}
          </span>
        ))}
    </div>
  );
}

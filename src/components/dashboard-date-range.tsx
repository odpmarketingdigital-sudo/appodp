"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  parseDateRangePreset,
} from "@/lib/date-ranges";

type DashboardDateRangeProps = {
  /** Caminho base da página (sem query string). Padrão: `/dashboard`. */
  basePath?: string;
};

export function DashboardDateRange({
  basePath = "/dashboard",
}: DashboardDateRangeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = parseDateRangePreset(searchParams.get("period") ?? undefined);

  function handleChange(preset: DateRangePreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", preset);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1">
      {DATE_RANGE_PRESETS.map((preset) => {
        const isActive = preset.id === current;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleChange(preset.id)}
            className={
              isActive
                ? "rounded-full bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100"
                : "rounded-full px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            }
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

import { format, subDays } from "date-fns";

import type { DateRange } from "@/types/integrations";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90";

export const DATE_RANGE_PRESETS: {
  id: DateRangePreset;
  label: string;
}[] = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last7", label: "Últimos 7 dias" },
  { id: "last30", label: "Últimos 30 dias" },
  { id: "last90", label: "Últimos 90 dias" },
];

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Resolve um preset de período em `start`/`end` (inclusive). */
export function resolveDateRangePreset(preset: DateRangePreset): DateRange {
  const today = new Date();

  switch (preset) {
    case "today":
      return { start: toIsoDate(today), end: toIsoDate(today) };
    case "yesterday": {
      const yesterday = subDays(today, 1);
      return { start: toIsoDate(yesterday), end: toIsoDate(yesterday) };
    }
    case "last7":
      return { start: toIsoDate(subDays(today, 6)), end: toIsoDate(today) };
    case "last30":
      return { start: toIsoDate(subDays(today, 29)), end: toIsoDate(today) };
    case "last90":
      return { start: toIsoDate(subDays(today, 89)), end: toIsoDate(today) };
    default:
      return { start: toIsoDate(subDays(today, 29)), end: toIsoDate(today) };
  }
}

export function parseDateRangePreset(
  value: string | undefined,
): DateRangePreset {
  if (
    value === "today" ||
    value === "yesterday" ||
    value === "last7" ||
    value === "last30" ||
    value === "last90"
  ) {
    return value;
  }
  return "last30";
}

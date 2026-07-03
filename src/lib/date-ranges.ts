import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";

import type { DateRange } from "@/types/integrations";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last30"
  | "last60";

export const DATE_RANGE_PRESETS: {
  id: DateRangePreset;
  label: string;
}[] = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last30", label: "30 Dias" },
  { id: "last60", label: "60 Dias" },
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
    case "last30":
      return { start: toIsoDate(subDays(today, 29)), end: toIsoDate(today) };
    case "last60":
      return { start: toIsoDate(subDays(today, 59)), end: toIsoDate(today) };
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
    value === "last30" ||
    value === "last60"
  ) {
    return value;
  }

  // Compatibilidade com URLs antigas.
  if (value === "last7") {
    return "last30";
  }
  if (value === "last90") {
    return "last60";
  }

  return "last30";
}

/** Dias inclusivos entre start e end (YYYY-MM-DD). */
export function rangeSpanDays(range: DateRange): number {
  return differenceInCalendarDays(parseISO(range.end), parseISO(range.start)) + 1;
}

/** Indica se o range corresponde a um período de 60 dias (inclusive). */
export function isSixtyDayRange(range: DateRange): boolean {
  const today = toIsoDate(new Date());
  const expectedStart = toIsoDate(subDays(new Date(), 59));
  return range.start === expectedStart && range.end === today;
}

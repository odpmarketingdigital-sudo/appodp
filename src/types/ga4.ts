import type { DateRange } from "@/types/integrations";

/** Propriedade listada pela Analytics Admin API. */
export type GA4PropertyOption = {
  propertyId: string;
  displayName: string;
  accountName: string;
};

/** Ponto da série temporal diária do GA4. */
export type GA4TimelinePoint = {
  date: string;
  activeUsers: number;
  engagedSessions: number;
  eventCount: number;
};

export type GA4BreakdownRow = {
  label: string;
  activeUsers: number;
  engagedSessions: number;
  eventCount: number;
};

/** Relatório consolidado para o dashboard da agência. */
export type GA4DashboardReport = {
  range: DateRange;
  propertyId: string;
  summary: {
    activeUsers: number;
    engagedSessions: number;
    eventCount: number;
  };
  timeline: GA4TimelinePoint[];
  cities: GA4BreakdownRow[];
  channels: GA4BreakdownRow[];
  fetchedAt: string;
};

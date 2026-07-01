"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { GA4DashboardReport } from "@/types/ga4";

const numberFormatter = new Intl.NumberFormat("pt-BR");

const CHART_COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#fb923c",
  "#e879f9",
  "#38bdf8",
];

function formatDateLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

type Ga4DashboardChartsProps = {
  report: GA4DashboardReport;
  /** `agency` = visão macro (cidades + canais). `client` = visão micro (+ timeline). */
  variant?: "agency" | "client";
};

export function Ga4DashboardCharts({
  report,
  variant = "agency",
}: Ga4DashboardChartsProps) {
  const { summary, timeline, cities, channels } = report;
  const isClientView = variant === "client";

  return (
    <div className="space-y-6">
      {isClientView && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Visitas"
            value={summary.activeUsers}
            hint="activeUsers"
            color="#60a5fa"
          />
          <SummaryCard
            label="Sessões engajadas"
            value={summary.engagedSessions}
            hint="engagedSessions"
            color="#34d399"
          />
          <SummaryCard
            label="Cliques / Conversões"
            value={summary.eventCount}
            hint="eventCount"
            color="#a78bfa"
          />
        </div>
      )}

      {isClientView && (
        <ChartCard title="Evolução temporal" subtitle="Métricas diárias do GA4">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timeline}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#27272a"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  stroke="#52525b"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  minTickGap={24}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => numberFormatter.format(v)}
                />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  name="Visitas"
                  stroke="#60a5fa"
                  fill="url(#gradUsers)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="engagedSessions"
                  name="Sessões engajadas"
                  stroke="#34d399"
                  fill="url(#gradSessions)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Top cidades" subtitle="Por visitas (activeUsers)">
          {cities.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cities}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid stroke="#27272a" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={100}
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar
                    dataKey="activeUsers"
                    name="Visitas"
                    fill="#60a5fa"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartHint message="Sem dados de localização no período." />
          )}
        </ChartCard>

        <ChartCard title="Canais de tráfego" subtitle="sessionSourceMedium">
          {channels.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channels}
                    dataKey="activeUsers"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {channels.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChartHint message="Sem dados de canais no período." />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: number;
  hint: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-100">
        {numberFormatter.format(value)}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      <div
        className="mt-3 h-1 rounded-full"
        style={{ backgroundColor: color, opacity: 0.5 }}
      />
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function EmptyChartHint({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-center">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}

function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950/95 px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs text-zinc-400">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-medium text-zinc-100">
          <span style={{ color: entry.color }}>{entry.name}</span>:{" "}
          {numberFormatter.format(Number(entry.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

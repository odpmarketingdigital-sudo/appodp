"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export type MetricPoint = {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
};

export type MetricChannel = {
  /** Valor do enum `IntegrationProvider` (ex.: "GA4", "META_ADS"). */
  provider: string;
  label: string;
  data: MetricPoint[];
};

type MetricKey = Exclude<keyof MetricPoint, "date">;

const METRICS: {
  key: MetricKey;
  label: string;
  color: string;
  currency: boolean;
}[] = [
  { key: "impressions", label: "Impressões", color: "#60a5fa", currency: false },
  { key: "clicks", label: "Cliques", color: "#34d399", currency: false },
  { key: "conversions", label: "Conversões", color: "#fbbf24", currency: false },
  { key: "cost", label: "Custo", color: "#f87171", currency: true },
  { key: "revenue", label: "Receita", color: "#a78bfa", currency: true },
];

/**
 * Sobrescreve os rótulos das métricas conforme o provedor, para que a mesma
 * estrutura de dados faça sentido em funis diferentes. Ex.: no RD Station,
 * "Impressões" vira "Visitas", "Cliques" vira "Leads" etc.
 */
const METRIC_LABEL_OVERRIDES: Record<string, Partial<Record<MetricKey, string>>> =
  {
    RD_STATION: {
      impressions: "Visitas",
      clicks: "Leads",
      conversions: "Oportunidades",
      revenue: "Vendas",
    },
  };

function metricLabelFor(
  key: MetricKey,
  defaultLabel: string,
  provider: string,
): string {
  return METRIC_LABEL_OVERRIDES[provider]?.[key] ?? defaultLabel;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numberFormatter = new Intl.NumberFormat("pt-BR");

function formatValue(value: number, currency: boolean): string {
  return currency ? currencyFormatter.format(value) : numberFormatter.format(value);
}

function formatDateLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

type MetricsChartProps = {
  channels: MetricChannel[];
};

export function MetricsChart({ channels }: MetricsChartProps) {
  // Canal inicial: o primeiro que já tiver dados; senão, o primeiro da lista.
  const initialChannel =
    channels.find((channel) => channel.data.length > 0)?.provider ??
    channels[0]?.provider ??
    "";

  const [activeChannel, setActiveChannel] = useState(initialChannel);
  const [active, setActive] = useState<MetricKey>("clicks");

  const metric = METRICS.find((m) => m.key === active) ?? METRICS[0];
  const channel =
    channels.find((c) => c.provider === activeChannel) ?? channels[0];
  const data = channel?.data ?? [];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      {/* Seletor de canal (provedor) */}
      <div className="mb-4 inline-flex rounded-full border border-zinc-800 bg-zinc-950 p-1">
        {channels.map((c) => {
          const isActive = c.provider === activeChannel;
          return (
            <button
              key={c.provider}
              type="button"
              onClick={() => setActiveChannel(c.provider)}
              className={
                isActive
                  ? "rounded-full bg-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-100"
                  : "rounded-full px-4 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 text-center">
          <p className="text-sm font-medium text-zinc-300">Nenhum dado ainda</p>
          <p className="mt-1 text-xs text-zinc-500">
            Clique em “Sincronizar {channel?.label ?? ""}” para coletar as
            métricas.
          </p>
        </div>
      ) : (
        <>
          {/* Seletor de métrica */}
          <div className="mb-4 flex flex-wrap gap-2">
            {METRICS.map((m) => {
              const isActive = m.key === active;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setActive(m.key)}
                  className={
                    isActive
                      ? "rounded-full px-3 py-1.5 text-xs font-medium text-zinc-900"
                      : "rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                  }
                  style={isActive ? { backgroundColor: m.color } : undefined}
                >
                  {metricLabelFor(m.key, m.label, activeChannel)}
                </button>
              );
            })}
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`grad-${metric.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={metric.color}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={metric.color}
                      stopOpacity={0}
                    />
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
                  width={56}
                  tickFormatter={(value: number) =>
                    metric.currency
                      ? currencyFormatter.format(value)
                      : numberFormatter.format(value)
                  }
                />
                <Tooltip
                  content={
                    <DarkTooltip
                      currency={metric.currency}
                      metricLabel={metricLabelFor(
                        metric.key,
                        metric.label,
                        activeChannel,
                      )}
                    />
                  }
                  cursor={{ stroke: "#3f3f46", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2}
                  fill={`url(#grad-${metric.key})`}
                  dot={false}
                  activeDot={{ r: 4, fill: metric.color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function DarkTooltip({
  active,
  payload,
  label,
  currency,
  metricLabel,
}: Partial<TooltipContentProps<number, string>> & {
  currency: boolean;
  metricLabel: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const value = payload[0]?.value;
  const dateLabel = typeof label === "string" ? formatDateLabel(label) : "";

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950/95 px-3 py-2 shadow-lg">
      <p className="text-xs text-zinc-400">{dateLabel}</p>
      <p className="text-sm font-semibold text-zinc-100">
        {metricLabel}: {formatValue(Number(value ?? 0), currency)}
      </p>
    </div>
  );
}

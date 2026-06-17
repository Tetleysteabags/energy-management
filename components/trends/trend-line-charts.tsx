"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendDay } from "@/lib/trends/queries";

type MetricKey = "eveningFatigue" | "sleepQuality" | "capacity";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "capacity", label: "Capacity", color: "#5DCAA5" },
  { key: "eveningFatigue", label: "Fatigue", color: "#9FE1CB" },
  { key: "sleepQuality", label: "Sleep quality", color: "#D3D1C7" },
];

const MAX_CHART_POINTS = 120;

type TrendLineChartsProps = {
  days: TrendDay[];
};

function windowDays(days: TrendDay[]): TrendDay[] {
  if (days.length <= MAX_CHART_POINTS) return days;
  const step = Math.ceil(days.length / MAX_CHART_POINTS);
  const windowed: TrendDay[] = [];
  for (let i = 0; i < days.length; i += step) {
    windowed.push(days[i]);
  }
  const last = days[days.length - 1];
  if (windowed[windowed.length - 1]?.logDate !== last.logDate) {
    windowed.push(last);
  }
  return windowed;
}

const MetricChart = memo(function MetricChart({
  label,
  color,
  metricKey,
  data,
}: {
  label: string;
  color: string;
  metricKey: MetricKey;
  data: { date: string; capacity: number | null; eveningFatigue: number | null; sleepQuality: number | null }[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="h-40 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            />
            <Line
              type="monotone"
              dataKey={metricKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export const TrendLineCharts = memo(function TrendLineCharts({ days }: TrendLineChartsProps) {
  const data = useMemo(
    () =>
      windowDays(days).map((day) => ({
        date: day.logDate.slice(5),
        capacity: day.capacity,
        eveningFatigue: day.eveningFatigue,
        sleepQuality: day.sleepQuality,
      })),
    [days],
  );

  if (data.length < 2) {
    return (
      <p className="text-muted-foreground text-sm">
        A few more logged days and simple charts will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {METRICS.map((metric) => (
        <MetricChart
          key={metric.key}
          label={metric.label}
          color={metric.color}
          metricKey={metric.key}
          data={data}
        />
      ))}
    </div>
  );
});

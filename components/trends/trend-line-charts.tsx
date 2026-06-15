"use client";

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

type TrendLineChartsProps = {
  days: TrendDay[];
};

export function TrendLineCharts({ days }: TrendLineChartsProps) {
  const data = days.map((day) => ({
    date: day.logDate.slice(5),
    capacity: day.capacity,
    eveningFatigue: day.eveningFatigue,
    sleepQuality: day.sleepQuality,
  }));

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
        <div key={metric.key} className="space-y-2">
          <p className="text-sm font-medium">{metric.label}</p>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

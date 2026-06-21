"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendDay } from "@/lib/trends/queries";

const MAX_CHART_POINTS = 120;

const ENERGY_MUSCLE_LINES = [
  { key: "capacity", label: "Capacity", color: "#5DCAA5" },
  { key: "eveningFatigue", label: "Fatigue", color: "#9FE1CB" },
  { key: "eveningMuscleLevel", label: "Muscle level", color: "#C4B5A0" },
] as const;

type ChartRow = {
  date: string;
  capacity: number | null;
  eveningFatigue: number | null;
  eveningMuscleLevel: number | null;
  sleepQuality: number | null;
};

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

const SleepChart = memo(function SleepChart({ data }: { data: ChartRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Sleep quality (how you felt)</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        From your morning check-in — separate from wearable sleep minutes.
      </p>
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
              dataKey="sleepQuality"
              name="Sleep quality"
              stroke="#D3D1C7"
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

const EnergyMuscleChart = memo(function EnergyMuscleChart({ data }: { data: ChartRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Energy &amp; muscle</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Evening capacity, fatigue, and muscle level on the same scale.
      </p>
      <div className="h-44 w-full min-w-0">
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {ENERGY_MUSCLE_LINES.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
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
        eveningMuscleLevel: day.eveningMuscleLevel,
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
      <EnergyMuscleChart data={data} />
      <SleepChart data={data} />
    </div>
  );
});

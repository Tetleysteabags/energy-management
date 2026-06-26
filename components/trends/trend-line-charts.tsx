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

const SYMPTOM_LINES = [
  { key: "capacity", label: "Capacity", color: "#5DCAA5" },
  { key: "eveningFatigue", label: "Fatigue", color: "#9FE1CB" },
  { key: "eveningMuscleLevel", label: "Muscle level", color: "#C4B5A0" },
  { key: "eveningChestFeeling", label: "Chest feeling", color: "#E8A598" },
] as const;

type ChartRow = {
  date: string;
  capacity: number | null;
  eveningFatigue: number | null;
  eveningMuscleLevel: number | null;
  eveningChestFeeling: number | null;
  sleepQuality: number | null;
  hrvMs: number | null;
  restingHr: number | null;
  sleepHoursWearable: number | null;
  sleepEfficiencyPct: number | null;
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

function toChartRows(days: TrendDay[]): ChartRow[] {
  return windowDays(days).map((day) => ({
    date: day.logDate.slice(5),
    capacity: day.capacity,
    eveningFatigue: day.eveningFatigue,
    eveningMuscleLevel: day.eveningMuscleLevel,
    eveningChestFeeling: day.eveningChestFeeling,
    sleepQuality: day.sleepQuality,
    hrvMs: day.hrvMs,
    restingHr: day.restingHr,
    sleepHoursWearable: day.sleepHoursWearable,
    sleepEfficiencyPct: day.sleepEfficiencyPct,
  }));
}

function hasAnyValue(data: ChartRow[], keys: (keyof ChartRow)[]): boolean {
  return data.some((row) => keys.some((key) => row[key] != null));
}

const SymptomChart = memo(function SymptomChart({ data }: { data: ChartRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Energy, muscle &amp; chest</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Evening check-in scores on a 0–10 scale. Chest feeling covers pain, heaviness, or
        tightness.
      </p>
      <div className="h-48 w-full min-w-0">
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
            {SYMPTOM_LINES.map((line) => (
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

const SleepChart = memo(function SleepChart({ data }: { data: ChartRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Sleep quality (how you felt)</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        From your morning check-in — separate from wearable sleep duration below.
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

const WearableRecoveryChart = memo(function WearableRecoveryChart({ data }: { data: ChartRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Overnight recovery (wearable)</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        HRV and resting heart rate from your connected device — usually the night ending this
        morning.
      </p>
      <div className="h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis
              yAxisId="hrv"
              tick={{ fontSize: 11 }}
              stroke="#9FE1CB"
              label={{ value: "HRV (ms)", angle: -90, position: "insideLeft", fontSize: 10 }}
            />
            <YAxis
              yAxisId="rhr"
              orientation="right"
              tick={{ fontSize: 11 }}
              stroke="#E8A598"
              label={{ value: "RHR (bpm)", angle: 90, position: "insideRight", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="hrv"
              type="monotone"
              dataKey="hrvMs"
              name="HRV"
              stroke="#9FE1CB"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              yAxisId="rhr"
              type="monotone"
              dataKey="restingHr"
              name="Resting HR"
              stroke="#E8A598"
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

const WearableSleepChart = memo(function WearableSleepChart({ data }: { data: ChartRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Sleep (wearable)</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Duration and efficiency from your device — not a subjective sleep-quality score.
      </p>
      <div className="h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis
              yAxisId="hours"
              tick={{ fontSize: 11 }}
              stroke="#D3D1C7"
              label={{ value: "Hours", angle: -90, position: "insideLeft", fontSize: 10 }}
            />
            <YAxis
              yAxisId="efficiency"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              stroke="#5DCAA5"
              label={{ value: "Efficiency %", angle: 90, position: "insideRight", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="hours"
              type="monotone"
              dataKey="sleepHoursWearable"
              name="Sleep (hours)"
              stroke="#D3D1C7"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              yAxisId="efficiency"
              type="monotone"
              dataKey="sleepEfficiencyPct"
              name="Efficiency"
              stroke="#5DCAA5"
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
  const data = useMemo(() => toChartRows(days), [days]);

  const showSymptoms = hasAnyValue(data, [
    "capacity",
    "eveningFatigue",
    "eveningMuscleLevel",
    "eveningChestFeeling",
  ]);
  const showSubjectiveSleep = hasAnyValue(data, ["sleepQuality"]);
  const showWearableRecovery = hasAnyValue(data, ["hrvMs", "restingHr"]);
  const showWearableSleep = hasAnyValue(data, ["sleepHoursWearable", "sleepEfficiencyPct"]);

  if (data.length < 2) {
    return (
      <p className="text-muted-foreground text-sm">
        A few more logged days and simple charts will appear here.
      </p>
    );
  }

  if (!showSymptoms && !showSubjectiveSleep && !showWearableRecovery && !showWearableSleep) {
    return (
      <p className="text-muted-foreground text-sm">
        Log check-ins or sync your wearable to see charts here.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {showSymptoms ? <SymptomChart data={data} /> : null}
      {showSubjectiveSleep ? <SleepChart data={data} /> : null}
      {showWearableRecovery ? <WearableRecoveryChart data={data} /> : null}
      {showWearableSleep ? <WearableSleepChart data={data} /> : null}
      {!showWearableRecovery && !showWearableSleep ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Connect a wearable on the Wearables page to add overnight HRV, resting HR, and sleep
          duration charts.
        </p>
      ) : null}
    </div>
  );
});

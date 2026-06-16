export type WearableMetricSnapshot = {
  sleepMinutes: number | null;
  restingHr: number | null;
  hrvMs: number | null;
  steps: number | null;
  activeMinutes: number | null;
  spo2: number | null;
  skinTempC: number | null;
};

export type WearableProvider = {
  id: "mock" | "google_health";
  label: string;
  syncDailyMetrics(userId: string, logDate: string): Promise<WearableMetricSnapshot>;
};

export const READ_METRICS = [
  "Sleep duration",
  "Resting heart rate",
  "HRV",
  "Steps",
  "Active minutes",
  "SpO₂",
  "Skin temperature",
] as const;

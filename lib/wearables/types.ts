export type WearableMetricSnapshot = {
  sleepMinutes: number | null;
  restingHr: number | null;
  hrvMs: number | null;
  steps: number | null;
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
  "SpO₂",
  "Skin temperature",
] as const;

export type WearableMetricSnapshot = {
  sleepMinutes: number | null;
  sleepWakeMinutes: number | null;
  /** Fraction asleep while in bed (0–1). */
  sleepEfficiency: number | null;
  restingHr: number | null;
  hrvMs: number | null;
  steps: number | null;
  activeMinutes: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  skinTempC: number | null;
};

export type WearableProvider = {
  id: "mock" | "google_health";
  label: string;
  syncDailyMetrics(userId: string, logDate: string): Promise<WearableMetricSnapshot>;
};

export const READ_METRICS = [
  "Sleep duration & efficiency",
  "Resting heart rate",
  "HRV",
  "Respiratory rate",
  "Steps",
  "Active minutes",
  "SpO₂",
  "Skin temperature",
] as const;

export function emptyWearableSnapshot(): WearableMetricSnapshot {
  return {
    sleepMinutes: null,
    sleepWakeMinutes: null,
    sleepEfficiency: null,
    restingHr: null,
    hrvMs: null,
    steps: null,
    activeMinutes: null,
    spo2: null,
    respiratoryRate: null,
    skinTempC: null,
  };
}

export function wearableSnapshotToDbRow(
  userId: string,
  logDate: string,
  source: string,
  metrics: WearableMetricSnapshot,
) {
  return {
    user_id: userId,
    log_date: logDate,
    source,
    sleep_minutes: metrics.sleepMinutes,
    sleep_wake_minutes: metrics.sleepWakeMinutes,
    sleep_efficiency: metrics.sleepEfficiency,
    resting_hr: metrics.restingHr,
    hrv_ms: metrics.hrvMs,
    steps: metrics.steps,
    active_minutes: metrics.activeMinutes,
    spo2: metrics.spo2,
    respiratory_rate: metrics.respiratoryRate,
    skin_temp_c: metrics.skinTempC,
  };
}

const DB_METRIC_KEYS = [
  "sleep_minutes",
  "sleep_wake_minutes",
  "sleep_efficiency",
  "resting_hr",
  "hrv_ms",
  "steps",
  "active_minutes",
  "spo2",
  "respiratory_rate",
  "skin_temp_c",
] as const;

export function mergeWearableDbRow(
  metrics: WearableMetricSnapshot,
  existing: Record<string, unknown> | null,
) {
  const row = wearableSnapshotToDbRow("", "", "", metrics);
  if (!existing) return row;

  const merged = { ...row } as Record<string, unknown>;
  for (const key of DB_METRIC_KEYS) {
    if (merged[key] == null && existing[key] != null) {
      merged[key] = existing[key];
    }
  }
  return merged;
}

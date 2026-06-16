import type { WearableMetricSnapshot, WearableProvider } from "./types";

function pseudoRandom(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

export const mockWearableProvider: WearableProvider = {
  id: "mock",
  label: "Mock wearable (dev)",
  async syncDailyMetrics(_userId, logDate) {
    const r = pseudoRandom(logDate);
    return {
      sleepMinutes: Math.round(360 + r * 180),
      restingHr: Math.round(58 + r * 12),
      hrvMs: Math.round(25 + r * 35),
      steps: Math.round(1500 + r * 4000),
      activeMinutes: Math.round(20 + r * 50),
      spo2: Math.round(95 + r * 4),
      skinTempC: Number((36.2 + r * 0.8).toFixed(1)),
    } satisfies WearableMetricSnapshot;
  },
};

export const googleHealthProvider: WearableProvider = {
  id: "google_health",
  label: "Fitbit / Google Health",
  async syncDailyMetrics() {
    // Real sync runs in lib/wearables/google-health/sync.ts with stored OAuth tokens.
    return {
      sleepMinutes: null,
      restingHr: null,
      hrvMs: null,
      steps: null,
      activeMinutes: null,
      spo2: null,
      skinTempC: null,
    };
  },
};

export function getProvider(id: "mock" | "google_health"): WearableProvider {
  return id === "google_health" ? googleHealthProvider : mockWearableProvider;
}

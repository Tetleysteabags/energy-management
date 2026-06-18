import { GOOGLE_HEALTH_API_BASE } from "./config";

type DataPointsResponse = {
  dataPoints?: Array<Record<string, unknown>>;
};

export type SleepSnapshot = {
  sleepMinutes: number | null;
  sleepWakeMinutes: number | null;
  sleepEfficiency: number | null;
};

function parseGoogleNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function nextDay(logDate: string): string {
  const date = new Date(`${logDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function fetchDataPoints(
  accessToken: string,
  dataType: string,
  filter: string,
  method: "list" | "reconcile" = "reconcile",
): Promise<DataPointsResponse> {
  const suffix = method === "reconcile" ? "dataPoints:reconcile" : "dataPoints";
  const url = new URL(`${GOOGLE_HEALTH_API_BASE}/users/me/dataTypes/${dataType}/${suffix}`);
  url.searchParams.set("filter", filter);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Health ${dataType} failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return (await response.json()) as DataPointsResponse;
}

export async function fetchSleepForWakeDate(
  accessToken: string,
  logDate: string,
): Promise<SleepSnapshot> {
  const end = nextDay(logDate);
  const filter = `sleep.interval.civil_end_time >= "${logDate}" AND sleep.interval.civil_end_time < "${end}"`;

  const data = await fetchDataPoints(accessToken, "sleep", filter, "list");
  const points = data.dataPoints ?? [];
  if (!points.length) {
    return { sleepMinutes: null, sleepWakeMinutes: null, sleepEfficiency: null };
  }

  let best: SleepSnapshot = { sleepMinutes: null, sleepWakeMinutes: null, sleepEfficiency: null };

  for (const point of points) {
    const summary = (point.sleep as { summary?: Record<string, unknown> } | undefined)?.summary;
    if (!summary) continue;

    const asleep = parseGoogleNumber(summary.minutesAsleep);
    const awake = parseGoogleNumber(summary.minutesAwake);
    const inPeriod = parseGoogleNumber(summary.minutesInSleepPeriod);
    const efficiency =
      asleep != null && inPeriod != null && inPeriod > 0
        ? Math.min(1, Math.max(0, asleep / inPeriod))
        : null;

    if (asleep == null) continue;
    if (best.sleepMinutes == null || asleep > best.sleepMinutes) {
      best = {
        sleepMinutes: Math.round(asleep),
        sleepWakeMinutes: awake != null ? Math.round(awake) : null,
        sleepEfficiency: efficiency != null ? Number(efficiency.toFixed(3)) : null,
      };
    }
  }

  return best;
}

export async function fetchSleepMinutesForWakeDate(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  const sleep = await fetchSleepForWakeDate(accessToken, logDate);
  return sleep.sleepMinutes;
}

export async function fetchStepsForDay(accessToken: string, logDate: string): Promise<number | null> {
  const end = nextDay(logDate);
  const filter = `steps.interval.civil_start_time >= "${logDate}" AND steps.interval.civil_start_time < "${end}"`;

  const data = await fetchDataPoints(accessToken, "steps", filter, "reconcile");
  const points = data.dataPoints ?? [];
  if (!points.length) return null;

  let total = 0;
  for (const point of points) {
    const steps = point.steps as { count?: unknown; countSum?: unknown } | undefined;
    const count = parseGoogleNumber(steps?.count ?? steps?.countSum);
    if (count != null) {
      total += count;
    }
  }
  return total > 0 ? Math.round(total) : null;
}

export async function fetchActiveMinutesForDay(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  const end = nextDay(logDate);
  const filter = `active_minutes.interval.civil_start_time >= "${logDate}" AND active_minutes.interval.civil_start_time < "${end}"`;

  try {
    const data = await fetchDataPoints(accessToken, "active-minutes", filter, "reconcile");
    const points = data.dataPoints ?? [];
    if (!points.length) return null;

    let total = 0;
    for (const point of points) {
      const levels = (
        point.activeMinutes as
          | { activeMinutesByActivityLevel?: Array<{ activeMinutes?: unknown }> }
          | undefined
      )?.activeMinutesByActivityLevel;
      for (const level of levels ?? []) {
        const minutes = parseGoogleNumber(level.activeMinutes);
        if (minutes != null) total += minutes;
      }
    }
    return total > 0 ? Math.round(total) : null;
  } catch {
    return null;
  }
}

export async function fetchSpo2ForDay(accessToken: string, logDate: string): Promise<number | null> {
  const filter = `daily_oxygen_saturation.date = "${logDate}"`;

  try {
    const data = await fetchDataPoints(accessToken, "daily-oxygen-saturation", filter, "list");
    const points = data.dataPoints ?? [];

    for (const point of points) {
      const spo2 = point.dailyOxygenSaturation as { averagePercentage?: unknown } | undefined;
      const value = parseGoogleNumber(spo2?.averagePercentage);
      if (value != null && value >= 80 && value <= 100) {
        return Math.round(value);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchRespiratoryRateForDay(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  const filter = `daily_respiratory_rate.date = "${logDate}"`;

  try {
    const data = await fetchDataPoints(accessToken, "daily-respiratory-rate", filter, "list");
    const points = data.dataPoints ?? [];

    for (const point of points) {
      const rr = point.dailyRespiratoryRate as { breathsPerMinute?: unknown } | undefined;
      const value = parseGoogleNumber(rr?.breathsPerMinute);
      if (value != null && value >= 5 && value <= 40) {
        return Math.round(value * 10) / 10;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchRestingHrForDay(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  const filter = `daily_resting_heart_rate.date = "${logDate}"`;

  try {
    const data = await fetchDataPoints(accessToken, "daily-resting-heart-rate", filter, "list");
    const points = data.dataPoints ?? [];

    for (const point of points) {
      const hr = point.dailyRestingHeartRate as { beatsPerMinute?: unknown } | undefined;
      const bpm = parseGoogleNumber(hr?.beatsPerMinute);
      if (bpm != null && bpm > 30 && bpm < 220) {
        return Math.round(bpm);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchHrvForDay(accessToken: string, logDate: string): Promise<number | null> {
  const filter = `daily_heart_rate_variability.date = "${logDate}"`;

  try {
    const data = await fetchDataPoints(accessToken, "daily-heart-rate-variability", filter, "list");
    const points = data.dataPoints ?? [];

    for (const point of points) {
      const hrv = point.dailyHeartRateVariability as
        | {
            deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds?: unknown;
            averageHeartRateVariabilityMilliseconds?: unknown;
          }
        | undefined;
      const value =
        parseGoogleNumber(hrv?.deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds) ??
        parseGoogleNumber(hrv?.averageHeartRateVariabilityMilliseconds);
      if (value != null) {
        return Math.round(value);
      }
    }
    return null;
  } catch {
    return null;
  }
}

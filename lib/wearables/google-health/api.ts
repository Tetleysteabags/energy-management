import { fetchDailyRollUp, rollupForDay } from "./daily-rollup";
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

function dailyDateRangeFilter(filterPrefix: string, logDate: string): string {
  const end = nextDay(logDate);
  return `${filterPrefix}.date >= "${logDate}" AND ${filterPrefix}.date < "${end}"`;
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

async function fetchDailyDataPoints(
  accessToken: string,
  dataType: string,
  filterPrefix: string,
  logDate: string,
): Promise<DataPointsResponse> {
  const filter = dailyDateRangeFilter(filterPrefix, logDate);

  const list = await fetchDataPoints(accessToken, dataType, filter, "list");
  if ((list.dataPoints ?? []).length > 0) return list;

  return fetchDataPoints(accessToken, dataType, filter, "reconcile");
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
  try {
    const rollup = await fetchDailyRollUp(accessToken, "steps", logDate);
    const point = rollupForDay(rollup, logDate);
    const count = parseGoogleNumber(
      (point?.steps as { countSum?: unknown } | undefined)?.countSum,
    );
    if (count != null && count > 0) return Math.round(count);
  } catch {
    // Fall through to interval reconcile.
  }

  const end = nextDay(logDate);
  const filter = `steps.interval.civil_start_time >= "${logDate}" AND steps.interval.civil_start_time < "${end}"`;

  const data = await fetchDataPoints(accessToken, "steps", filter, "reconcile");
  const points = data.dataPoints ?? [];
  if (!points.length) return null;

  let total = 0;
  for (const point of points) {
    const steps = point.steps as { count?: unknown; countSum?: unknown } | undefined;
    const count = parseGoogleNumber(steps?.count ?? steps?.countSum);
    if (count != null) total += count;
  }
  return total > 0 ? Math.round(total) : null;
}

export async function fetchActiveMinutesForDay(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  const rollup = await fetchDailyRollUp(accessToken, "active-minutes", logDate);
  const point = rollupForDay(rollup, logDate);
  const levels = (
    point?.activeMinutes as
      | {
          activeMinutesRollupByActivityLevel?: Array<{ activeMinutesSum?: unknown }>;
          activeMinutesByActivityLevel?: Array<{ activeMinutes?: unknown }>;
        }
      | undefined
  );

  let total = 0;
  for (const level of levels?.activeMinutesRollupByActivityLevel ?? []) {
    const minutes = parseGoogleNumber(level.activeMinutesSum);
    if (minutes != null) total += minutes;
  }
  for (const level of levels?.activeMinutesByActivityLevel ?? []) {
    const minutes = parseGoogleNumber(level.activeMinutes);
    if (minutes != null) total += minutes;
  }

  return total > 0 ? Math.round(total) : null;
}

async function fetchDailyScalar(
  accessToken: string,
  dataType: string,
  filterPrefix: string,
  extract: (point: Record<string, unknown>) => number | null,
  logDate: string,
): Promise<number | null> {
  const data = await fetchDailyDataPoints(accessToken, dataType, filterPrefix, logDate);
  const points = data.dataPoints ?? [];

  for (const point of points) {
    const value = extract(point);
    if (value != null) return value;
  }
  return null;
}

export async function fetchSpo2ForDay(accessToken: string, logDate: string): Promise<number | null> {
  return fetchDailyScalar(
    accessToken,
    "daily-oxygen-saturation",
    "daily_oxygen_saturation",
    (point) => {
      const spo2 = point.dailyOxygenSaturation as { averagePercentage?: unknown } | undefined;
      const value = parseGoogleNumber(spo2?.averagePercentage);
      return value != null && value >= 80 && value <= 100 ? Math.round(value) : null;
    },
    logDate,
  );
}

export async function fetchRespiratoryRateForDay(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  return fetchDailyScalar(
    accessToken,
    "daily-respiratory-rate",
    "daily_respiratory_rate",
    (point) => {
      const rr = point.dailyRespiratoryRate as { breathsPerMinute?: unknown } | undefined;
      const value = parseGoogleNumber(rr?.breathsPerMinute);
      return value != null && value >= 5 && value <= 40 ? Math.round(value * 10) / 10 : null;
    },
    logDate,
  );
}

export async function fetchRestingHrForDay(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  return fetchDailyScalar(
    accessToken,
    "daily-resting-heart-rate",
    "daily_resting_heart_rate",
    (point) => {
      const hr = point.dailyRestingHeartRate as { beatsPerMinute?: unknown } | undefined;
      const bpm = parseGoogleNumber(hr?.beatsPerMinute);
      return bpm != null && bpm > 30 && bpm < 220 ? Math.round(bpm) : null;
    },
    logDate,
  );
}

export async function fetchHrvForDay(accessToken: string, logDate: string): Promise<number | null> {
  return fetchDailyScalar(
    accessToken,
    "daily-heart-rate-variability",
    "daily_heart_rate_variability",
    (point) => {
      const hrv = point.dailyHeartRateVariability as
        | {
            deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds?: unknown;
            averageHeartRateVariabilityMilliseconds?: unknown;
          }
        | undefined;
      const value =
        parseGoogleNumber(hrv?.deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds) ??
        parseGoogleNumber(hrv?.averageHeartRateVariabilityMilliseconds);
      return value != null ? Math.round(value) : null;
    },
    logDate,
  );
}

async function fetchWithPreviousDayFallback(
  fetcher: (accessToken: string, logDate: string) => Promise<number | null>,
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  const value = await fetcher(accessToken, logDate);
  if (value != null) return value;

  const previous = new Date(`${logDate}T12:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const previousDate = previous.toISOString().slice(0, 10);
  return fetcher(accessToken, previousDate);
}

export async function fetchOvernightRestingHr(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  return fetchWithPreviousDayFallback(fetchRestingHrForDay, accessToken, logDate);
}

export async function fetchOvernightHrv(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  return fetchWithPreviousDayFallback(fetchHrvForDay, accessToken, logDate);
}

export async function fetchOvernightSpo2(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  return fetchWithPreviousDayFallback(fetchSpo2ForDay, accessToken, logDate);
}

export async function fetchOvernightRespiratoryRate(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  return fetchWithPreviousDayFallback(fetchRespiratoryRateForDay, accessToken, logDate);
}

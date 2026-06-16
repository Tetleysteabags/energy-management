import { GOOGLE_HEALTH_API_BASE } from "./config";

type DataPointsResponse = {
  dataPoints?: Array<Record<string, unknown>>;
};

function dayWindowUtc(logDate: string): { start: string; end: string } {
  return {
    start: `${logDate}T00:00:00Z`,
    end: `${logDate}T23:59:59Z`,
  };
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

export async function fetchSleepMinutesForWakeDate(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  const end = nextDay(logDate);
  const filter = `sleep.interval.end_time >= "${logDate}T00:00:00Z" AND sleep.interval.end_time < "${end}T00:00:00Z"`;

  const data = await fetchDataPoints(accessToken, "sleep", filter, "list");
  const points = data.dataPoints ?? [];
  if (!points.length) return null;

  let best: number | null = null;
  for (const point of points) {
    const sleep = point.sleep as { summary?: { minutesAsleep?: number } } | undefined;
    const minutes = sleep?.summary?.minutesAsleep;
    if (typeof minutes === "number" && (best == null || minutes > best)) {
      best = minutes;
    }
  }
  return best;
}

export async function fetchStepsForDay(accessToken: string, logDate: string): Promise<number | null> {
  const { start, end } = dayWindowUtc(logDate);
  const filter = `steps.interval.start_time >= "${start}" AND steps.interval.start_time <= "${end}"`;

  const data = await fetchDataPoints(accessToken, "steps", filter, "reconcile");
  const points = data.dataPoints ?? [];
  if (!points.length) return null;

  let total = 0;
  for (const point of points) {
    const steps = point.steps as { countSum?: number } | undefined;
    if (typeof steps?.countSum === "number") {
      total += steps.countSum;
    }
  }
  return total > 0 ? total : null;
}

export async function fetchRestingHrForDay(
  accessToken: string,
  logDate: string,
): Promise<number | null> {
  const { start, end } = dayWindowUtc(logDate);
  const filter = `heart_rate.sample_time.physical_time >= "${start}" AND heart_rate.sample_time.physical_time <= "${end}"`;

  try {
    const data = await fetchDataPoints(accessToken, "heart-rate", filter, "reconcile");
    const points = data.dataPoints ?? [];
    const values: number[] = [];

    for (const point of points) {
      const hr = point.heartRate as { value?: { beatsPerMinute?: number } } | undefined;
      const bpm = hr?.value?.beatsPerMinute;
      if (typeof bpm === "number" && bpm > 30 && bpm < 220) {
        values.push(bpm);
      }
    }

    if (!values.length) return null;
    return Math.round(values.sort((a, b) => a - b)[Math.floor(values.length * 0.1)] ?? values[0]);
  } catch {
    return null;
  }
}

export async function fetchHrvForDay(accessToken: string, logDate: string): Promise<number | null> {
  const filter = `heart_rate_variability.date = "${logDate}"`;

  try {
    const data = await fetchDataPoints(accessToken, "heart-rate-variability", filter, "list");
    const points = data.dataPoints ?? [];
    for (const point of points) {
      const hrv = point.heartRateVariability as
        | { dailyRmssd?: { value?: number } }
        | undefined;
      const value = hrv?.dailyRmssd?.value;
      if (typeof value === "number") {
        return Math.round(value);
      }
    }
    return null;
  } catch {
    return null;
  }
}

import { GOOGLE_HEALTH_API_BASE } from "./config";

type CivilDate = { year: number; month: number; day: number };

type DailyRollupResponse = {
  rollupDataPoints?: Array<Record<string, unknown>>;
};

function parseLogDate(logDate: string): CivilDate {
  const [year, month, day] = logDate.split("-").map(Number);
  return { year, month, day };
}

function nextLogDate(logDate: string): string {
  const date = new Date(`${logDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function civilDay(logDate: string) {
  return { date: parseLogDate(logDate) };
}

export async function fetchDailyRollUp(
  accessToken: string,
  dataType: string,
  logDate: string,
): Promise<DailyRollupResponse> {
  const end = nextLogDate(logDate);
  const url = `${GOOGLE_HEALTH_API_BASE}/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range: {
        start: civilDay(logDate),
        end: civilDay(end),
      },
      windowSizeDays: 1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Health ${dataType} dailyRollUp failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return (await response.json()) as DailyRollupResponse;
}

export function rollupForDay(
  response: DailyRollupResponse,
  logDate: string,
): Record<string, unknown> | null {
  const points = response.rollupDataPoints ?? [];
  for (const point of points) {
    const start = point.civilStartTime as { date?: CivilDate } | undefined;
    if (!start?.date) continue;
    const { year, month, day } = start.date;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso === logDate) return point;
  }
  return points[0] ?? null;
}

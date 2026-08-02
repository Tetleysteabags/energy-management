/**
 * Log dates are calendar days in the *user's* timezone, not the server's.
 *
 * The server runs in UTC, so deriving a log date from `toISOString()` puts an
 * evening check-in in Los Angeles onto the next day's row — which inverts the
 * day-D-load → day-D+1-symptom relationship the analysis engine looks for.
 * Every helper here therefore takes the user's IANA zone; server callers read
 * it from `profiles.timezone` via `getUserTimeZone()`, client components take
 * it as a prop so both sides agree on what "today" means.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_LOG_DATE_LOOKBACK_DAYS = 90;

/** Used when a user's zone is unknown — deterministic, unlike server-local time. */
export const FALLBACK_TIME_ZONE = "UTC";

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(value?: string | null): string {
  return isValidTimeZone(value) ? value : FALLBACK_TIME_ZONE;
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partsInTimeZone(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts: Record<string, string> = {};
  for (const { type, value } of formatter.formatToParts(date)) {
    parts[type] = value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some environments render midnight as hour 24 under hour12: false.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/** How far ahead of UTC `timeZone` sits at `date`, in milliseconds. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = partsInTimeZone(date, timeZone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  // Intl parts carry no milliseconds, so compare against whole seconds.
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The calendar date `date` falls on in `timeZone`. */
export function isoDateInTimeZone(date: Date, timeZone?: string | null): string {
  const { year, month, day } = partsInTimeZone(date, resolveTimeZone(timeZone));
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function todayLogDate(timeZone?: string | null): string {
  return isoDateInTimeZone(new Date(), timeZone);
}

/** Hour of day (0–23) in `timeZone` — so greetings match the user's clock, not the server's. */
export function hourInTimeZone(date: Date, timeZone?: string | null): number {
  return partsInTimeZone(date, resolveTimeZone(timeZone)).hour;
}

/** Shift a log date by whole days. Pure calendar arithmetic — zone-independent. */
export function addDaysToLogDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function yesterdayLogDate(fromDate?: string, timeZone?: string | null): string {
  return addDaysToLogDate(fromDate ?? todayLogDate(timeZone), -1);
}

export function isToday(isoDate: string, timeZone?: string | null): boolean {
  return isoDate === todayLogDate(timeZone);
}

/** Stable across server and client: always renders the date itself, never a shifted one. */
export function formatLogDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function isRealCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Falls back to today for anything missing, malformed, future, or past the lookback window. */
export function parseLogDateParam(
  value: string | undefined,
  timeZone?: string | null,
): string {
  const today = todayLogDate(timeZone);
  const trimmed = value?.trim();

  if (!trimmed || !isRealCalendarDate(trimmed)) return today;
  // ISO dates sort lexicographically, so plain comparison is a date comparison.
  if (trimmed > today) return today;
  if (trimmed < addDaysToLogDate(today, -MAX_LOG_DATE_LOOKBACK_DAYS)) return today;

  return trimmed;
}

/** The instant of 12:00 local time on `logDate` — used to timestamp back-dated events. */
export function middayIsoForLogDate(logDate: string, timeZone?: string | null): string {
  const zone = resolveTimeZone(timeZone);
  const [year, month, day] = logDate.split("-").map(Number);
  const middayAsUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  const offset = timeZoneOffsetMs(new Date(middayAsUtc), zone);
  return new Date(middayAsUtc - offset).toISOString();
}

export function logDateQueryParam(logDate: string, timeZone?: string | null): string {
  return isToday(logDate, timeZone) ? "" : `?date=${logDate}`;
}

export function homePathForLogDate(logDate: string, timeZone?: string | null): string {
  return isToday(logDate, timeZone) ? "/" : `/?date=${logDate}`;
}

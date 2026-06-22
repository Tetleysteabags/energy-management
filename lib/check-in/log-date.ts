const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_LOG_DATE_LOOKBACK_DAYS = 90;

export function todayLogDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayLogDate(fromDate = todayLogDate()): string {
  const date = new Date(`${fromDate}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function isToday(isoDate: string): boolean {
  return isoDate === todayLogDate();
}

export function formatLogDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function parseLogDateParam(value: string | undefined): string {
  const today = todayLogDate();
  if (!value?.trim()) return today;

  const trimmed = value.trim();
  if (!parseIsoDate(trimmed)) return today;
  if (compareIsoDates(trimmed, today) > 0) return today;

  const earliest = new Date(`${today}T12:00:00`);
  earliest.setDate(earliest.getDate() - MAX_LOG_DATE_LOOKBACK_DAYS);
  const earliestIso = earliest.toISOString().slice(0, 10);
  if (compareIsoDates(trimmed, earliestIso) < 0) return today;

  return trimmed;
}

export function middayIsoForLogDate(logDate: string): string {
  return new Date(`${logDate}T12:00:00`).toISOString();
}

export function logDateQueryParam(logDate: string): string {
  return isToday(logDate) ? "" : `?date=${logDate}`;
}

export function homePathForLogDate(logDate: string): string {
  return isToday(logDate) ? "/" : `/?date=${logDate}`;
}

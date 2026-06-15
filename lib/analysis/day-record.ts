import type { DbDailyLog } from "./db-frame";

/** Minimal shape for crash-rule preview in settings (not the engine frame). */
export type CrashPreviewRecord = {
  pem: number;
  capacity: number;
};

export function dailyLogToCrashPreview(row: DbDailyLog): CrashPreviewRecord | null {
  if (!row.morning_submitted_at && !row.evening_submitted_at) return null;

  return {
    pem: row.pem ?? 0,
    capacity: row.capacity ?? 10,
  };
}

export function rowsToCrashPreviewRecords(rows: DbDailyLog[]): CrashPreviewRecord[] {
  return rows
    .map(dailyLogToCrashPreview)
    .filter((row): row is CrashPreviewRecord => row != null);
}

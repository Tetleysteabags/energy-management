/**
 * CSV import for historical check-ins.
 *
 * Two things matter here. The parser has to survive real spreadsheet output —
 * quoted fields, embedded commas and newlines, doubled quotes — so a file
 * exported from this app can be read back in. And bad values have to be
 * reported per row: previously anything out of range reached the database and
 * came back as a raw Postgres constraint error that failed the entire batch and
 * told the user nothing about which row was wrong.
 */

import { MAX_NOTES_LENGTH } from "@/lib/check-in/scales";

export { MAX_NOTES_LENGTH };

type CsvRow = Record<string, string>;

type NumericRule = { min: number; max: number; integer: boolean };

const SYMPTOM: NumericRule = { min: 0, max: 10, integer: true };
const LOAD: NumericRule = { min: 0, max: 3, integer: true };
const SLEEP_HOURS: NumericRule = { min: 0, max: 24, integer: false };

const NUMERIC_COLUMNS: Record<string, NumericRule> = {
  sleep_quality: SYMPTOM,
  sleep_hours: SLEEP_HOURS,
  rested_score: SYMPTOM,
  morning_fatigue: SYMPTOM,
  morning_brain_fog: SYMPTOM,
  morning_pain: SYMPTOM,
  morning_dysautonomia: SYMPTOM,
  physical_load: LOAD,
  cognitive_load: LOAD,
  social_load: LOAD,
  capacity: SYMPTOM,
  evening_fatigue: SYMPTOM,
  evening_brain_fog: SYMPTOM,
  evening_pain: SYMPTOM,
  evening_chest_feeling: SYMPTOM,
  pem: SYMPTOM,
};

const COLUMN_MAP: Record<string, string> = {
  date: "log_date",
  log_date: "log_date",
  notes: "notes",
  ...Object.fromEntries(Object.keys(NUMERIC_COLUMNS).map((key) => [key, key])),
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Bounds the work a single upload can cause; ~5 years of daily logs. */
export const MAX_IMPORT_ROWS = 2000;

/**
 * RFC 4180 parser. Walks the whole document rather than splitting on newlines
 * first, because a quoted field is allowed to contain them.
 */
export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const stripped = text.replace(/^﻿/, "");
  const records: string[][] = [];

  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let sawAnyChar = false;

  const endField = () => {
    record.push(field.trim());
    field = "";
  };

  const endRecord = () => {
    endField();
    // Skip blank lines rather than emitting a row of empty strings.
    if (record.some((value) => value !== "")) records.push(record);
    record = [];
    sawAnyChar = false;
  };

  for (let i = 0; i < stripped.length; i += 1) {
    const char = stripped[i];
    sawAnyChar = true;

    if (inQuotes) {
      if (char === '"') {
        if (stripped[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\n") {
      endRecord();
    } else if (char === "\r") {
      // Handled by the \n that follows in CRLF files; a lone \r also ends a row.
      if (stripped[i + 1] !== "\n") endRecord();
    } else {
      field += char;
    }
  }

  if (sawAnyChar || field !== "" || record.length) endRecord();

  if (records.length < 2) return { headers: [], rows: [] };

  const headers = records[0].map((header) => header.toLowerCase());
  const rows = records.slice(1).map((values) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
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

export type ImportRowError = { line: number; reason: string };

export type ParsedImport = {
  payloads: Record<string, unknown>[];
  errors: ImportRowError[];
  /** Rows dropped because the file exceeded MAX_IMPORT_ROWS. */
  truncated: number;
};

/**
 * Converts parsed rows into `daily_logs` payloads, collecting a reason for every
 * row it rejects. Valid rows still import — one bad line does not sink the file.
 */
export function csvRowsToDailyLogs(rows: CsvRow[]): ParsedImport {
  const payloads: Record<string, unknown>[] = [];
  const errors: ImportRowError[] = [];
  const seenDates = new Set<string>();

  const considered = rows.slice(0, MAX_IMPORT_ROWS);
  const truncated = rows.length - considered.length;

  considered.forEach((row, index) => {
    // +2: one for the header line, one because humans count from 1.
    const line = index + 2;
    const logDate = (row.date || row.log_date || "").trim();

    if (!logDate) {
      errors.push({ line, reason: "no date" });
      return;
    }

    if (!isRealCalendarDate(logDate)) {
      errors.push({ line, reason: `"${logDate}" is not a date in YYYY-MM-DD form` });
      return;
    }

    if (seenDates.has(logDate)) {
      errors.push({ line, reason: `${logDate} appears more than once` });
      return;
    }

    const payload: Record<string, unknown> = { log_date: logDate };
    let rejected = false;

    for (const [csvKey, dbKey] of Object.entries(COLUMN_MAP)) {
      const raw = row[csvKey]?.trim();
      if (!raw) continue;

      if (dbKey === "log_date") continue;

      if (dbKey === "notes") {
        if (raw.length > MAX_NOTES_LENGTH) {
          errors.push({
            line,
            reason: `notes are ${raw.length} characters (limit ${MAX_NOTES_LENGTH})`,
          });
          rejected = true;
          break;
        }
        payload.notes = raw;
        continue;
      }

      const rule = NUMERIC_COLUMNS[dbKey];
      const value = Number(raw);

      if (!Number.isFinite(value)) {
        errors.push({ line, reason: `${csvKey} "${raw}" is not a number` });
        rejected = true;
        break;
      }

      if (value < rule.min || value > rule.max) {
        errors.push({ line, reason: `${csvKey} ${value} is outside ${rule.min}–${rule.max}` });
        rejected = true;
        break;
      }

      payload[dbKey] = rule.integer ? Math.round(value) : Math.round(value * 10) / 10;
    }

    if (rejected) return;

    // Only stamp a check-in as submitted when the file actually carried values
    // for it, so a morning-only import doesn't fabricate an evening entry.
    if (payload.morning_fatigue != null || payload.sleep_quality != null) {
      payload.morning_submitted_at = `${logDate}T08:00:00.000Z`;
    }
    if (payload.evening_fatigue != null || payload.capacity != null) {
      payload.evening_submitted_at = `${logDate}T20:00:00.000Z`;
    }

    seenDates.add(logDate);
    payloads.push(payload);
  });

  return { payloads, errors, truncated };
}

export const CSV_TEMPLATE = `date,sleep_quality,morning_fatigue,physical_load,cognitive_load,capacity,evening_fatigue,pem,notes
2026-06-01,6,5,1,2,5,4,2,
2026-06-02,7,4,2,1,6,3,1,`;

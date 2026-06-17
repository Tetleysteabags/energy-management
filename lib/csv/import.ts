type CsvRow = Record<string, string>;

const COLUMN_MAP: Record<string, string> = {
  date: "log_date",
  log_date: "log_date",
  sleep_quality: "sleep_quality",
  sleep_hours: "sleep_hours",
  rested_score: "rested_score",
  morning_fatigue: "morning_fatigue",
  morning_brain_fog: "morning_brain_fog",
  morning_pain: "morning_pain",
  morning_dysautonomia: "morning_dysautonomia",
  physical_load: "physical_load",
  cognitive_load: "cognitive_load",
  social_load: "social_load",
  capacity: "capacity",
  evening_fatigue: "evening_fatigue",
  evening_brain_fog: "evening_brain_fog",
  evening_pain: "evening_pain",
  evening_chest_feeling: "evening_chest_feeling",
  pem: "pem",
  notes: "notes",
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  result.push(current.trim());
  return result;
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

export function csvRowsToDailyLogs(rows: CsvRow[]): Record<string, unknown>[] {
  return rows
    .map((row) => {
      const logDate = row.date || row.log_date;
      if (!logDate) return null;

      const payload: Record<string, unknown> = {
        log_date: logDate,
      };

      for (const [csvKey, dbKey] of Object.entries(COLUMN_MAP)) {
        const raw = row[csvKey];
        if (raw == null || raw === "") continue;

        if (dbKey === "log_date" || dbKey === "notes") {
          payload[dbKey] = raw;
          continue;
        }

        const num = Number.parseFloat(raw);
        if (!Number.isNaN(num)) {
          payload[dbKey] = num;
        }
      }

      if (payload.morning_fatigue != null || payload.sleep_quality != null) {
        payload.morning_submitted_at = new Date(`${logDate}T08:00:00`).toISOString();
      }
      if (payload.evening_fatigue != null || payload.capacity != null) {
        payload.evening_submitted_at = new Date(`${logDate}T20:00:00`).toISOString();
      }

      return payload;
    })
    .filter((row): row is Record<string, unknown> => row != null);
}

export const CSV_TEMPLATE = `date,sleep_quality,morning_fatigue,physical_load,cognitive_load,capacity,evening_fatigue,pem,notes
2026-06-01,6,5,1,2,5,4,2,
2026-06-02,7,4,2,1,6,3,1,`;

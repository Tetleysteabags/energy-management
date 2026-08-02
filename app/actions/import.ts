"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { csvRowsToDailyLogs, MAX_IMPORT_ROWS, parseCsv } from "@/lib/csv/import";

type ImportResult = {
  error?: string;
  imported?: number;
  skipped?: number;
  /** Human-readable reasons for the first few rejected rows. */
  issues?: string[];
};

/** Enough to show the user what went wrong without printing the whole file back. */
const MAX_REPORTED_ISSUES = 5;

export async function importDailyLogsCsv(formData: FormData): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a CSV file." };

  const text = await file.text();
  const { rows } = parseCsv(text);
  const { payloads, errors, truncated } = csvRowsToDailyLogs(rows);

  const issues = errors
    .slice(0, MAX_REPORTED_ISSUES)
    .map(({ line, reason }) => `Row ${line}: ${reason}`);

  if (truncated > 0) {
    issues.push(`${truncated} row(s) past the ${MAX_IMPORT_ROWS}-row limit were not read.`);
  }

  if (!payloads.length) {
    return {
      error: errors.length
        ? "None of those rows could be read."
        : "No valid rows found. Need at least a date column.",
      issues,
    };
  }

  const { error } = await supabase.from("daily_logs").upsert(
    payloads.map((row) => ({ ...row, user_id: user.id })),
    { onConflict: "user_id,log_date" },
  );

  // Row-level problems are caught above, so anything left is ours, not theirs.
  if (error) return { error: "Couldn't save those rows. Try again in a moment." };

  revalidatePath("/");
  revalidatePath("/trends");
  revalidatePath("/analysis");
  revalidatePath("/import");

  return {
    imported: payloads.length,
    skipped: errors.length + Math.max(0, truncated),
    issues,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { csvRowsToDailyLogs, parseCsv } from "@/lib/csv/import";

type ImportResult = { error?: string; imported?: number };

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
  const payloads = csvRowsToDailyLogs(rows).map((row) => ({
    ...row,
    user_id: user.id,
  }));

  if (!payloads.length) {
    return { error: "No valid rows found. Need at least a date column." };
  }

  const { error } = await supabase.from("daily_logs").upsert(payloads, {
    onConflict: "user_id,log_date",
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/trends");
  revalidatePath("/analysis");
  revalidatePath("/import");

  return { imported: payloads.length };
}

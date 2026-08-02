import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv/format";

/**
 * Every column a check-in can hold, in a sensible reading order. This doubles
 * as the data-portability export, so it is deliberately complete rather than
 * the handful of columns a summary would need.
 */
const EXPORT_COLUMNS = [
  "log_date",
  "sleep_quality",
  "sleep_hours",
  "rested_score",
  "morning_fatigue",
  "morning_brain_fog",
  "morning_pain",
  "morning_dysautonomia",
  "morning_submitted_at",
  "physical_load",
  "cognitive_load",
  "social_load",
  "capacity",
  "evening_fatigue",
  "evening_brain_fog",
  "evening_pain",
  "evening_chest_feeling",
  "pem",
  "alcohol",
  "alcohol_units",
  "late_caffeine",
  "late_meal",
  "on_period",
  "is_crash",
  "is_excluded",
  "notes",
  "evening_submitted_at",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Could not build the export." }, { status: 500 });
  }

  const csv = toCsv(EXPORT_COLUMNS, rows ?? []);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="recovery-tracker-export.csv"',
      // A personal health export should never be cached by a proxy or the browser.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

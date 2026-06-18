import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { runAnalysisFromDb } from "@/lib/analysis/run-analysis";
import type { AnalysisOutput } from "@/lib/analysis/types";

export const getAnalysisOutput = cache(async (): Promise<AnalysisOutput | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rows } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  const { data: wearables } = await supabase
    .from("wearable_daily_metrics")
    .select(
      "log_date, sleep_minutes, sleep_wake_minutes, sleep_efficiency, resting_hr, hrv_ms, steps, active_minutes, spo2, respiratory_rate, skin_temp_c",
    )
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  return runAnalysisFromDb(rows ?? [], wearables ?? []);
});

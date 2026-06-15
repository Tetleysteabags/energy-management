"use server";

import { buildFrame } from "@/lib/analysis/analysis-engine";
import { rowsToEngineInput } from "@/lib/analysis/db-frame";
import { runExploreQueryOnFrame } from "@/lib/analysis/explore-ui";
import type { ExploreQuery } from "@/lib/analysis/types";
import { createClient } from "@/lib/supabase/server";

export async function runExploreAction(query: ExploreQuery) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { blocked: true, blockReason: "You need to be signed in." };
  }

  const { data: rows } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  const { data: wearables } = await supabase
    .from("wearable_daily_metrics")
    .select("log_date, sleep_minutes, resting_hr, hrv_ms, steps, spo2, skin_temp_c")
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  const input = rowsToEngineInput(rows ?? [], wearables ?? []);
  const frame = buildFrame(input.symptoms, input.loads, input.wearables);

  return runExploreQueryOnFrame(frame, query);
}

import { createClient } from "@/lib/supabase/server";
import { capacitySummarySentence } from "@/lib/trends/capacity";

export type TrendDay = {
  logDate: string;
  capacity: number | null;
  eveningFatigue: number | null;
  sleepQuality: number | null;
  isCrash: boolean;
};

export async function getTrendData(): Promise<{
  days: TrendDay[];
  summary: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rows } = await supabase
    .from("daily_logs")
    .select(
      "log_date, capacity, evening_fatigue, sleep_quality, is_crash, evening_submitted_at, morning_submitted_at",
    )
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  const days: TrendDay[] =
    rows
      ?.filter((row) => row.evening_submitted_at || row.morning_submitted_at)
      .map((row) => ({
        logDate: row.log_date,
        capacity: row.capacity,
        eveningFatigue: row.evening_fatigue,
        sleepQuality: row.sleep_quality,
        isCrash: row.is_crash ?? false,
      })) ?? [];

  return {
    days,
    summary: capacitySummarySentence(days),
  };
}

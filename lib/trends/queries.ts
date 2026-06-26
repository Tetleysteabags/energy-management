import { createClient } from "@/lib/supabase/server";
import { capacitySummarySentence } from "@/lib/trends/capacity";

export type TrendDay = {
  logDate: string;
  capacity: number | null;
  eveningFatigue: number | null;
  eveningMuscleLevel: number | null;
  eveningChestFeeling: number | null;
  sleepQuality: number | null;
  isCrash: boolean;
  hrvMs: number | null;
  restingHr: number | null;
  /** Wearable sleep duration in hours (overnight ending this calendar morning). */
  sleepHoursWearable: number | null;
  /** Wearable sleep efficiency as 0–100%. */
  sleepEfficiencyPct: number | null;
};

type DailyLogRow = {
  log_date: string;
  capacity: number | null;
  evening_fatigue: number | null;
  evening_pain: number | null;
  evening_chest_feeling: number | null;
  morning_dysautonomia: number | null;
  sleep_quality: number | null;
  is_crash: boolean | null;
  evening_submitted_at: string | null;
  morning_submitted_at: string | null;
};

type WearableRow = {
  log_date: string;
  sleep_minutes: number | null;
  sleep_efficiency: number | string | null;
  resting_hr: number | null;
  hrv_ms: number | null;
};

function chestFeelingFromRow(row: DailyLogRow): number | null {
  return row.evening_chest_feeling ?? row.morning_dysautonomia;
}

function trendDayFromLog(row: DailyLogRow): TrendDay {
  return {
    logDate: row.log_date,
    capacity: row.capacity,
    eveningFatigue: row.evening_fatigue,
    eveningMuscleLevel: row.evening_pain,
    eveningChestFeeling: chestFeelingFromRow(row),
    sleepQuality: row.sleep_quality,
    isCrash: row.is_crash ?? false,
    hrvMs: null,
    restingHr: null,
    sleepHoursWearable: null,
    sleepEfficiencyPct: null,
  };
}

function applyWearable(day: TrendDay, row: WearableRow): TrendDay {
  const efficiency =
    row.sleep_efficiency != null ? Number(row.sleep_efficiency) * 100 : null;

  return {
    ...day,
    hrvMs: row.hrv_ms ?? day.hrvMs,
    restingHr: row.resting_hr ?? day.restingHr,
    sleepHoursWearable:
      row.sleep_minutes != null ? Number((row.sleep_minutes / 60).toFixed(1)) : day.sleepHoursWearable,
    sleepEfficiencyPct:
      efficiency != null ? Number(efficiency.toFixed(1)) : day.sleepEfficiencyPct,
  };
}

function emptyTrendDay(logDate: string): TrendDay {
  return {
    logDate,
    capacity: null,
    eveningFatigue: null,
    eveningMuscleLevel: null,
    eveningChestFeeling: null,
    sleepQuality: null,
    isCrash: false,
    hrvMs: null,
    restingHr: null,
    sleepHoursWearable: null,
    sleepEfficiencyPct: null,
  };
}

export async function getTrendData(): Promise<{
  days: TrendDay[];
  chartDays: TrendDay[];
  summary: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: logRows }, { data: wearableRows }] = await Promise.all([
    supabase
      .from("daily_logs")
      .select(
        "log_date, capacity, evening_fatigue, evening_pain, evening_chest_feeling, morning_dysautonomia, sleep_quality, is_crash, evening_submitted_at, morning_submitted_at",
      )
      .eq("user_id", user.id)
      .order("log_date", { ascending: true }),
    supabase
      .from("wearable_daily_metrics")
      .select("log_date, sleep_minutes, sleep_efficiency, resting_hr, hrv_ms")
      .eq("user_id", user.id)
      .order("log_date", { ascending: true }),
  ]);

  const days: TrendDay[] =
    logRows
      ?.filter((row) => row.evening_submitted_at || row.morning_submitted_at)
      .map((row) => trendDayFromLog(row as DailyLogRow)) ?? [];

  const wearableByDate = new Map(
    (wearableRows ?? []).map((row) => [row.log_date, row as WearableRow]),
  );

  const daysWithWearable = days.map((day) => {
    const wearable = wearableByDate.get(day.logDate);
    return wearable ? applyWearable(day, wearable) : day;
  });

  const allDates = [
    ...new Set([
      ...daysWithWearable.map((day) => day.logDate),
      ...(wearableRows ?? []).map((row) => row.log_date),
    ]),
  ].sort();

  const logByDate = new Map(daysWithWearable.map((day) => [day.logDate, day]));

  const chartDays = allDates.map((logDate) => {
    const base = logByDate.get(logDate) ?? emptyTrendDay(logDate);
    const wearable = wearableByDate.get(logDate);
    return wearable ? applyWearable(base, wearable) : base;
  });

  return {
    days: daysWithWearable,
    chartDays,
    summary: capacitySummarySentence(daysWithWearable),
  };
}

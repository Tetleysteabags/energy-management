import { createClient } from "@/lib/supabase/server";
import { greetingForHour } from "@/lib/check-in/greeting";
import { BASELINE_TARGET_DAYS } from "@/lib/check-in/scales";
import {
  DEFAULT_EVENING,
  DEFAULT_MORNING,
  type EveningCheckInValues,
  type MorningCheckInValues,
} from "@/lib/check-in/types";

type DailyLogRow = {
  log_date: string;
  sleep_quality: number | null;
  sleep_hours: string | null;
  rested_score: number | null;
  morning_fatigue: number | null;
  morning_brain_fog: number | null;
  morning_pain: number | null;
  morning_dysautonomia: number | null;
  morning_submitted_at: string | null;
  physical_load: number | null;
  cognitive_load: number | null;
  social_load: number | null;
  capacity: number | null;
  evening_fatigue: number | null;
  evening_brain_fog: number | null;
  evening_pain: number | null;
  pem: number | null;
  alcohol: boolean | null;
  alcohol_units: number | null;
  late_caffeine: boolean | null;
  late_meal: boolean | null;
  notes: string | null;
  evening_submitted_at: string | null;
};

export type DueCheckIn = "morning" | "evening" | "done";

export function todayLogDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayLogDate(fromDate = todayLogDate()): string {
  const date = new Date(`${fromDate}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function dueCheckIn(morningDone: boolean, eveningDone: boolean): DueCheckIn {
  if (!morningDone) return "morning";
  if (!eveningDone) return "evening";
  return "done";
}

function rowToMorning(row: DailyLogRow | null): MorningCheckInValues | null {
  if (!row?.morning_submitted_at) {
    return null;
  }

  return {
    sleepQuality: row.sleep_quality ?? DEFAULT_MORNING.sleepQuality,
    sleepHours: row.sleep_hours ? Number.parseFloat(row.sleep_hours) : null,
    restedScore: row.rested_score ?? DEFAULT_MORNING.restedScore,
    morningFatigue: row.morning_fatigue ?? DEFAULT_MORNING.morningFatigue,
    morningBrainFog: row.morning_brain_fog ?? DEFAULT_MORNING.morningBrainFog,
    morningPain: row.morning_pain ?? DEFAULT_MORNING.morningPain,
    morningDysautonomia:
      row.morning_dysautonomia ?? DEFAULT_MORNING.morningDysautonomia,
  };
}

function rowToEvening(row: DailyLogRow | null): EveningCheckInValues | null {
  if (!row?.evening_submitted_at) {
    return null;
  }

  return {
    physicalLoad: row.physical_load ?? DEFAULT_EVENING.physicalLoad,
    cognitiveLoad: row.cognitive_load ?? DEFAULT_EVENING.cognitiveLoad,
    socialLoad: row.social_load ?? DEFAULT_EVENING.socialLoad,
    capacity: row.capacity ?? DEFAULT_EVENING.capacity,
    eveningFatigue: row.evening_fatigue ?? DEFAULT_EVENING.eveningFatigue,
    eveningBrainFog: row.evening_brain_fog ?? DEFAULT_EVENING.eveningBrainFog,
    eveningPain: row.evening_pain ?? DEFAULT_EVENING.eveningPain,
    pem: row.pem ?? DEFAULT_EVENING.pem,
    alcohol: row.alcohol ?? false,
    alcoholUnits: row.alcohol_units ?? 0,
    lateCaffeine: row.late_caffeine ?? false,
    lateMeal: row.late_meal ?? false,
    notes: row.notes ?? "",
  };
}

function morningFromRowPartial(row: DailyLogRow | null): MorningCheckInValues {
  if (!row) {
    return DEFAULT_MORNING;
  }

  return {
    sleepQuality: row.sleep_quality ?? DEFAULT_MORNING.sleepQuality,
    sleepHours: row.sleep_hours ? Number.parseFloat(row.sleep_hours) : null,
    restedScore: row.rested_score ?? DEFAULT_MORNING.restedScore,
    morningFatigue: row.morning_fatigue ?? DEFAULT_MORNING.morningFatigue,
    morningBrainFog: row.morning_brain_fog ?? DEFAULT_MORNING.morningBrainFog,
    morningPain: row.morning_pain ?? DEFAULT_MORNING.morningPain,
    morningDysautonomia:
      row.morning_dysautonomia ?? DEFAULT_MORNING.morningDysautonomia,
  };
}

function eveningFromRowPartial(row: DailyLogRow | null): EveningCheckInValues {
  if (!row) {
    return DEFAULT_EVENING;
  }

  return {
    physicalLoad: row.physical_load ?? DEFAULT_EVENING.physicalLoad,
    cognitiveLoad: row.cognitive_load ?? DEFAULT_EVENING.cognitiveLoad,
    socialLoad: row.social_load ?? DEFAULT_EVENING.socialLoad,
    capacity: row.capacity ?? DEFAULT_EVENING.capacity,
    eveningFatigue: row.evening_fatigue ?? DEFAULT_EVENING.eveningFatigue,
    eveningBrainFog: row.evening_brain_fog ?? DEFAULT_EVENING.eveningBrainFog,
    eveningPain: row.evening_pain ?? DEFAULT_EVENING.eveningPain,
    pem: row.pem ?? DEFAULT_EVENING.pem,
    alcohol: row.alcohol ?? false,
    alcoholUnits: row.alcohol_units ?? 0,
    lateCaffeine: row.late_caffeine ?? false,
    lateMeal: row.late_meal ?? false,
    notes: row.notes ?? "",
  };
}

function morningInitial(todayRow: DailyLogRow | null, yesterdayRow: DailyLogRow | null) {
  if (todayRow?.morning_submitted_at) {
    return morningFromRowPartial(todayRow);
  }
  return rowToMorning(yesterdayRow) ?? DEFAULT_MORNING;
}

function eveningInitial(todayRow: DailyLogRow | null, yesterdayRow: DailyLogRow | null) {
  if (todayRow?.evening_submitted_at) {
    return eveningFromRowPartial(todayRow);
  }
  const fromYesterday = rowToEvening(yesterdayRow);
  const base = fromYesterday ? { ...fromYesterday, notes: "" } : DEFAULT_EVENING;

  if (todayRow) {
    return {
      ...base,
      alcohol: todayRow.alcohol ?? base.alcohol,
      alcoholUnits: todayRow.alcohol_units ?? base.alcoholUnits,
      lateCaffeine: todayRow.late_caffeine ?? base.lateCaffeine,
      lateMeal: todayRow.late_meal ?? base.lateMeal,
    };
  }

  return base;
}

export async function getCheckInContext(logDate = todayLogDate()) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const yesterday = yesterdayLogDate(logDate);

  const { data: rows } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .in("log_date", [logDate, yesterday]);

  const todayRow = (rows?.find((row) => row.log_date === logDate) ?? null) as DailyLogRow | null;
  const yesterdayRow = (rows?.find((row) => row.log_date === yesterday) ?? null) as DailyLogRow | null;

  return {
    logDate,
    today: {
      morning: morningInitial(todayRow, yesterdayRow),
      evening: eveningInitial(todayRow, yesterdayRow),
      morningSubmitted: Boolean(todayRow?.morning_submitted_at),
      eveningSubmitted: Boolean(todayRow?.evening_submitted_at),
    },
    yesterday: {
      morning: rowToMorning(yesterdayRow),
      evening: rowToEvening(yesterdayRow),
    },
    hints: {
      morning: rowToMorning(yesterdayRow),
      evening: rowToEvening(yesterdayRow),
    },
  };
}

export type CheckInContext = NonNullable<Awaited<ReturnType<typeof getCheckInContext>>>;

export async function getHomeState() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const logDate = todayLogDate();
  const yesterday = yesterdayLogDate(logDate);

  const { data: rows } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .in("log_date", [logDate, yesterday]);

  const todayRow = (rows?.find((row) => row.log_date === logDate) ?? null) as DailyLogRow | null;
  const yesterdayRow = (rows?.find((row) => row.log_date === yesterday) ?? null) as DailyLogRow | null;

  const morningDone = Boolean(todayRow?.morning_submitted_at);
  const eveningDone = Boolean(todayRow?.evening_submitted_at);

  const { count } = await supabase
    .from("daily_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or("morning_submitted_at.not.is.null,evening_submitted_at.not.is.null");

  const totalLoggedDays = count ?? 0;
  const baselineDaysRemaining = Math.max(0, BASELINE_TARGET_DAYS - totalLoggedDays);

  return {
    logDate,
    greeting: greetingForHour(),
    due: dueCheckIn(morningDone, eveningDone),
    morningDone,
    eveningDone,
    totalLoggedDays,
    baselineDaysRemaining,
    yesterdayMorning: rowToMorning(yesterdayRow),
    yesterdayEvening: rowToEvening(yesterdayRow),
    prefillMorning: morningInitial(todayRow, yesterdayRow),
    prefillEvening: eveningInitial(todayRow, yesterdayRow),
    todayFactors: {
      alcohol: todayRow?.alcohol ?? false,
      alcoholUnits: todayRow?.alcohol_units ?? 0,
      lateCaffeine: todayRow?.late_caffeine ?? false,
      lateMeal: todayRow?.late_meal ?? false,
    },
  };
}

export type HomeState = NonNullable<Awaited<ReturnType<typeof getHomeState>>>;

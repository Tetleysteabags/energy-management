import type {
  LoadRowLike,
  SymptomRowLike,
  WearableRowLike,
} from "./analysis-engine";

export type DbDailyLog = {
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
  evening_chest_feeling: number | null;
  pem: number | null;
  alcohol: boolean | null;
  alcohol_units: number | null;
  late_caffeine: boolean | null;
  late_meal: boolean | null;
  evening_submitted_at: string | null;
  is_excluded: boolean | null;
  is_crash: boolean | null;
};

export type DbWearableMetric = {
  log_date: string;
  sleep_minutes: number | null;
  sleep_wake_minutes?: number | null;
  sleep_efficiency?: number | string | null;
  resting_hr: number | null;
  hrv_ms: number | null;
  steps: number | null;
  active_minutes?: number | null;
  spo2: number | null;
  respiratory_rate?: number | string | null;
  skin_temp_c: string | null;
};

function num(value: number | null | undefined): number | undefined {
  return value == null ? undefined : value;
}

export function dailyLogToSymptomRow(row: DbDailyLog): SymptomRowLike | null {
  if (!row.morning_submitted_at && !row.evening_submitted_at) return null;

  const chestScore =
    num(row.evening_chest_feeling ?? row.morning_dysautonomia) ?? 0;

  return {
    date: row.log_date,
    fatigue_score: num(row.evening_fatigue ?? row.morning_fatigue) ?? 0,
    pem_score: num(row.pem) ?? 0,
    chest_heaviness_score: chestScore,
    muscle_soreness_score: num(row.evening_pain ?? row.morning_pain) ?? 0,
    brain_fog_score: num(row.evening_brain_fog ?? row.morning_brain_fog) ?? 0,
    sinus_congestion_score: chestScore,
    subjective_sleep_quality: num(row.sleep_quality) ?? 0,
    overall_capacity_score: num(row.capacity) ?? 0,
    is_excluded: row.is_excluded ? 1 : 0,
  };
}

export function dailyLogToLoadRow(row: DbDailyLog): LoadRowLike | null {
  if (!row.evening_submitted_at) return null;

  const meetingLoad = Math.max(
    row.cognitive_load ?? 0,
    row.social_load ?? 0,
  );

  return {
    date: row.log_date,
    physical_load_score: num(row.physical_load) ?? 0,
    meeting_load_score: meetingLoad,
    talking_minutes: (row.social_load ?? 0) * 20,
    mental_stress_score: num(row.cognitive_load) ?? 0,
    pacing_quality_score: num(row.rested_score) ?? 5,
    environment_score: 5,
    alcohol: row.alcohol ?? false,
    alcohol_units: num(row.alcohol_units) ?? 0,
    late_caffeine: row.late_caffeine ?? false,
    late_meal: row.late_meal ?? false,
    is_excluded: row.is_excluded ? 1 : 0,
  };
}

export function wearableMetricToRow(row: DbWearableMetric): WearableRowLike | null {
  const hasData =
    row.sleep_minutes != null ||
    row.resting_hr != null ||
    row.hrv_ms != null ||
    row.steps != null ||
    row.active_minutes != null ||
    row.spo2 != null ||
    row.respiratory_rate != null;

  if (!hasData) return null;

  const sleepEfficiency = row.sleep_efficiency != null ? Number(row.sleep_efficiency) : null;

  return {
    date: row.log_date,
    total_sleep_minutes: num(row.sleep_minutes) ?? 0,
    wake_minutes: num(row.sleep_wake_minutes) ?? 0,
    sleep_efficiency: sleepEfficiency ?? 0.85,
    resting_hr: num(row.resting_hr) ?? 0,
    hrv_rmssd: num(row.hrv_ms) ?? 0,
    respiratory_rate: row.respiratory_rate != null ? Number(row.respiratory_rate) : 0,
    spo2: num(row.spo2) ?? 0,
    temperature_deviation: row.skin_temp_c ? Number.parseFloat(row.skin_temp_c) : 0,
    steps: num(row.steps) ?? 0,
    active_minutes: num(row.active_minutes) ?? 0,
    sedentary_minutes: 0,
  };
}

export function rowsToEngineInput(
  dailyLogs: DbDailyLog[],
  wearables: DbWearableMetric[] = [],
) {
  const symptoms = dailyLogs
    .map(dailyLogToSymptomRow)
    .filter((row): row is SymptomRowLike => row != null);
  const loads = dailyLogs
    .map(dailyLogToLoadRow)
    .filter((row): row is LoadRowLike => row != null);
  const wearableRows = wearables
    .map(wearableMetricToRow)
    .filter((row): row is WearableRowLike => row != null);

  return { symptoms, loads, wearables: wearableRows };
}

/** UI field names → engine frame field names */
export const UI_TO_ENGINE_FIELD: Record<string, string> = {
  physical_load: "physical_load_score",
  cognitive_load: "meeting_load_score",
  social_load: "meeting_load_score",
  sleep_quality: "subjective_sleep_quality",
  morning_fatigue: "fatigue_score",
  evening_fatigue: "fatigue_score",
  morning_brain_fog: "brain_fog_score",
  evening_brain_fog: "brain_fog_score",
  capacity: "overall_capacity_score",
  pem: "pem_score",
  morning_chest_feeling: "chest_heaviness_score",
  evening_chest_feeling: "chest_heaviness_score",
  morning_muscle_level: "muscle_soreness_score",
  evening_muscle_level: "muscle_soreness_score",
  morning_pain: "muscle_soreness_score",
  evening_pain: "muscle_soreness_score",
  morning_dysautonomia: "chest_heaviness_score",
  alcohol: "alcohol_units",
  late_caffeine: "late_caffeine",
  late_meal: "late_meal",
};

export const ENGINE_LOAD_FIELDS = new Set([
  "physical_load_score",
  "meeting_load_score",
  "mental_stress_score",
]);

export function uiFieldToEngine(field: string): string {
  return UI_TO_ENGINE_FIELD[field] ?? field;
}

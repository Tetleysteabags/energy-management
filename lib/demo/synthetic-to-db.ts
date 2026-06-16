import type {
  Dataset,
  LoadRow,
  SymptomRow,
  WearableRow,
} from "@/lib/analysis/synthetic-data-generator";

export type DemoDailyLogInsert = {
  user_id: string;
  log_date: string;
  sleep_quality: number;
  sleep_hours: number;
  rested_score: number;
  morning_fatigue: number;
  morning_brain_fog: number;
  morning_pain: number;
  morning_dysautonomia: number;
  morning_submitted_at: string;
  physical_load: number;
  cognitive_load: number;
  social_load: number;
  capacity: number;
  evening_fatigue: number;
  evening_brain_fog: number;
  evening_pain: number;
  pem: number;
  alcohol: boolean;
  alcohol_units: number;
  late_caffeine: boolean;
  late_meal: boolean;
  notes: string;
  evening_submitted_at: string;
  is_crash: boolean;
};

export type DemoWearableInsert = {
  user_id: string;
  log_date: string;
  sleep_minutes: number;
  resting_hr: number;
  hrv_ms: number;
  steps: number;
  active_minutes: number;
  spo2: number;
  skin_temp_c: number;
  source: string;
};

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Slide synthetic dates so the last observed day is yesterday (keeps gaps). */
export function shiftDatasetToEndYesterday(ds: Dataset): Dataset {
  if (!ds.symptoms.length) return ds;

  const lastDate = [...ds.symptoms.map((row) => row.date)].sort().at(-1)!;
  const target = yesterdayIso();
  const offset = Math.round(
    (new Date(`${target}T12:00:00Z`).getTime() -
      new Date(`${lastDate}T12:00:00Z`).getTime()) /
      86_400_000,
  );

  if (offset === 0) return ds;

  const shift = (date: string) => addDays(date, offset);

  return {
    symptoms: ds.symptoms.map((row) => ({ ...row, date: shift(row.date) })),
    loads: ds.loads.map((row) => ({ ...row, date: shift(row.date) })),
    wearables: ds.wearables.map((row) => ({ ...row, date: shift(row.date) })),
    groundTruth: {
      ...ds.groundTruth,
      startDate: shift(ds.groundTruth.startDate),
      missingDates: ds.groundTruth.missingDates.map(shift),
    },
  };
}

function timestampFor(date: string, hour: number): string {
  return new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`).toISOString();
}

function symptomToLog(
  symptom: SymptomRow,
  load: LoadRow,
  userId: string,
): DemoDailyLogInsert {
  const isCrash = symptom.pem_score >= 7;

  return {
    user_id: userId,
    log_date: symptom.date,
    sleep_quality: symptom.subjective_sleep_quality,
    sleep_hours: 7,
    rested_score: load.pacing_quality_score,
    morning_fatigue: symptom.fatigue_score,
    morning_brain_fog: symptom.brain_fog_score,
    morning_pain: symptom.muscle_soreness_score,
    morning_dysautonomia: Math.max(
      symptom.chest_heaviness_score,
      symptom.sinus_congestion_score,
    ),
    morning_submitted_at: timestampFor(symptom.date, 8),
    physical_load: load.physical_load_score,
    cognitive_load: load.mental_stress_score,
    social_load: load.meeting_load_score,
    capacity: symptom.overall_capacity_score,
    evening_fatigue: symptom.fatigue_score,
    evening_brain_fog: symptom.brain_fog_score,
    evening_pain: symptom.muscle_soreness_score,
    pem: symptom.pem_score,
    alcohol: load.alcohol,
    alcohol_units: Math.round(load.alcohol_units),
    late_caffeine: load.late_caffeine,
    late_meal: load.late_meal,
    notes: [symptom.notes, load.notes].filter(Boolean).join(" · "),
    evening_submitted_at: timestampFor(symptom.date, 20),
    is_crash: isCrash,
  };
}

function wearableToRow(wearable: WearableRow, userId: string): DemoWearableInsert {
  return {
    user_id: userId,
    log_date: wearable.date,
    sleep_minutes: wearable.total_sleep_minutes,
    resting_hr: Math.round(wearable.resting_hr),
    hrv_ms: Math.round(wearable.hrv_rmssd),
    steps: wearable.steps,
    active_minutes: wearable.active_minutes,
    spo2: Math.round(wearable.spo2),
    skin_temp_c: wearable.temperature_deviation,
    source: wearable.source || "mock",
  };
}

export function datasetToDbRows(
  ds: Dataset,
  userId: string,
  opts?: { skipToday?: boolean },
): { dailyLogs: DemoDailyLogInsert[]; wearables: DemoWearableInsert[] } {
  const today = new Date().toISOString().slice(0, 10);
  const loadByDate = new Map(ds.loads.map((row) => [row.date, row]));
  const wearableByDate = new Map(ds.wearables.map((row) => [row.date, row]));

  const dailyLogs: DemoDailyLogInsert[] = [];

  for (const symptom of ds.symptoms) {
    if (opts?.skipToday && symptom.date === today) continue;

    const load = loadByDate.get(symptom.date);
    if (!load) continue;

    const wearable = wearableByDate.get(symptom.date);
    const log = symptomToLog(symptom, load, userId);
    if (wearable) {
      log.sleep_hours = Math.round((wearable.total_sleep_minutes / 60) * 10) / 10;
    }

    dailyLogs.push(log);
  }

  const wearables = ds.wearables
    .filter((row) => !(opts?.skipToday && row.date === today))
    .map((row) => wearableToRow(row, userId));

  return { dailyLogs, wearables };
}

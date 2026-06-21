"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EveningCheckInValues, MorningCheckInValues } from "@/lib/check-in/types";

type ActionResult = { error?: string };

function clampSymptom(value: number): number {
  return Math.min(10, Math.max(0, Math.round(value)));
}

function clampLoad(value: number): number {
  return Math.min(3, Math.max(0, Math.round(value)));
}

export async function submitMorningCheckIn({
  logDate,
  values,
}: {
  logDate: string;
  values: MorningCheckInValues;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be signed in." };
  }

  const payload = {
    user_id: user.id,
    log_date: logDate,
    sleep_quality: clampSymptom(values.sleepQuality),
    sleep_hours: values.sleepHours,
    rested_score: clampSymptom(values.restedScore),
    morning_fatigue: clampSymptom(values.morningFatigue),
    morning_brain_fog: clampSymptom(values.morningBrainFog),
    morning_pain: clampSymptom(values.morningMuscleLevel),
    morning_dysautonomia: clampSymptom(values.morningChestFeeling),
    morning_submitted_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("daily_logs").upsert(payload, {
    onConflict: "user_id,log_date",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/check-in/morning");
  revalidatePath("/analysis");
  revalidatePath("/trends");
  return {};
}

export async function submitEveningCheckIn({
  logDate,
  values,
}: {
  logDate: string;
  values: EveningCheckInValues;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be signed in." };
  }

  const payload = {
    user_id: user.id,
    log_date: logDate,
    physical_load: clampLoad(values.physicalLoad),
    cognitive_load: clampLoad(values.cognitiveLoad),
    social_load: clampLoad(values.socialLoad),
    capacity: clampSymptom(values.capacity),
    evening_fatigue: clampSymptom(values.eveningFatigue),
    evening_brain_fog: clampSymptom(values.eveningBrainFog),
    evening_pain: clampSymptom(values.eveningMuscleLevel),
    evening_chest_feeling: clampSymptom(values.eveningChestFeeling),
    pem: clampSymptom(values.pem),
    alcohol: values.alcohol,
    alcohol_units: values.alcohol
      ? Math.min(20, Math.max(0, Math.round(values.alcoholUnits)))
      : null,
    late_caffeine: values.lateCaffeine,
    late_meal: values.lateMeal,
    on_period: values.onPeriod,
    notes: values.notes.trim() || null,
    evening_submitted_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("daily_logs").upsert(payload, {
    onConflict: "user_id,log_date",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/check-in/evening");
  revalidatePath("/analysis");
  revalidatePath("/trends");
  return {};
}

export async function saveDayFactors({
  logDate,
  alcohol,
  alcoholUnits,
  lateCaffeine,
  lateMeal,
  onPeriod,
}: {
  logDate: string;
  alcohol: boolean;
  alcoholUnits: number;
  lateCaffeine: boolean;
  lateMeal: boolean;
  onPeriod: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be signed in." };
  }

  const payload = {
    user_id: user.id,
    log_date: logDate,
    alcohol,
    alcohol_units: alcohol ? Math.min(20, Math.max(0, Math.round(alcoholUnits))) : null,
    late_caffeine: lateCaffeine,
    late_meal: lateMeal,
    on_period: onPeriod,
  };

  const { error } = await supabase.from("daily_logs").upsert(payload, {
    onConflict: "user_id,log_date",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/check-in/evening");
  revalidatePath("/analysis");
  revalidatePath("/trends");
  return {};
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

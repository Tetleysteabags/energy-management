"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { previewCrashRule } from "@/lib/crashes/rules";
import { dailyLogToCrashPreview, rowsToCrashPreviewRecords } from "@/lib/analysis/day-record";

type ActionResult = { error?: string; previewCount?: number };

export async function updateCrashRule({
  matchMode,
  pemThreshold,
  capacityThreshold,
}: {
  matchMode: "any" | "all";
  pemThreshold: number;
  capacityThreshold: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("crash_rule_versions").insert({
    user_id: user.id,
    active_from: new Date().toISOString().slice(0, 10),
    match_mode: matchMode,
    pem_threshold: pemThreshold,
    capacity_threshold: capacityThreshold,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/crash-rule");
  return {};
}

export async function previewCrashRuleAction({
  matchMode,
  pemThreshold,
  capacityThreshold,
}: {
  matchMode: "any" | "all";
  pemThreshold: number;
  capacityThreshold: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { data: rows } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  const count = previewCrashRule(rowsToCrashPreviewRecords(rows ?? []), {
    matchMode,
    pemThreshold,
    capacityThreshold,
  });

  return { previewCount: count };
}

export async function recomputePastCrashes(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { data: rule } = await supabase
    .from("crash_rule_versions")
    .select("*")
    .eq("user_id", user.id)
    .order("active_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!rule) return { error: "No crash rule found." };

  const { data: rows } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id);

  const { evaluateCrashDay } = await import("@/lib/crashes/rules");

  for (const row of rows ?? []) {
    const record = dailyLogToCrashPreview(row);
    if (!record) continue;

    const isCrash = evaluateCrashDay(record, {
      matchMode: rule.match_mode as "any" | "all",
      pemThreshold: rule.pem_threshold,
      capacityThreshold: rule.capacity_threshold,
    });

    await supabase
      .from("daily_logs")
      .update({ is_crash: isCrash })
      .eq("user_id", user.id)
      .eq("log_date", row.log_date);

    if (isCrash) {
      await supabase.from("day_crashes").upsert(
        {
          user_id: user.id,
          log_date: row.log_date,
          crash_rule_version_id: rule.id,
        },
        { onConflict: "user_id,log_date,crash_rule_version_id" },
      );
    }
  }

  revalidatePath("/trends");
  revalidatePath("/settings/crash-rule");
  return {};
}

export async function updateLlmNotesEnabled(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    llm_notes_enabled: enabled,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function updateTrackCycle(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    track_cycle: enabled,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/check-in/evening");
  return {};
}

export async function confirmNoteTag(tagId: string, confirmed: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("note_tags")
    .update({ confirmed })
    .eq("id", tagId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/notes");
  return {};
}

export async function watchHypothesis({
  predictor,
  outcome,
  lagDays,
}: {
  predictor: string;
  outcome: string;
  lagDays: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("watched_hypotheses").insert({
    user_id: user.id,
    predictor,
    outcome,
    lag_days: lagDays,
  });

  if (error) return { error: error.message };

  revalidatePath("/explore");
  revalidatePath("/analysis");
  return {};
}

export async function confirmNoteTagAction(tagId: string, confirmed: boolean): Promise<void> {
  await confirmNoteTag(tagId, confirmed);
}

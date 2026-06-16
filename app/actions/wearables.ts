"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/wearables/providers";

type ActionResult = { error?: string };

export async function connectWearable(provider: "mock" | "google_health"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("wearable_connections").upsert(
    {
      user_id: user.id,
      provider,
      status: "connected",
      token_encrypted: provider === "google_health" ? "pending_oauth" : null,
      metadata: { connected_at: new Date().toISOString() },
    },
    { onConflict: "user_id,provider" },
  );

  if (error) return { error: error.message };

  revalidatePath("/wearables");
  revalidatePath("/settings/wearables");
  return {};
}

export async function disconnectWearable(provider: "mock" | "google_health"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("wearable_connections")
    .update({ status: "disconnected", token_encrypted: null })
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) return { error: error.message };

  revalidatePath("/wearables");
  return {};
}

export async function syncWearableNow(provider: "mock" | "google_health"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const logDate = new Date().toISOString().slice(0, 10);
  const metrics = await getProvider(provider).syncDailyMetrics(user.id, logDate);

  const { error: metricError } = await supabase.from("wearable_daily_metrics").upsert(
    {
      user_id: user.id,
      log_date: logDate,
      source: provider,
      sleep_minutes: metrics.sleepMinutes,
      resting_hr: metrics.restingHr,
      hrv_ms: metrics.hrvMs,
      steps: metrics.steps,
      active_minutes: metrics.activeMinutes,
      spo2: metrics.spo2,
      skin_temp_c: metrics.skinTempC,
    },
    { onConflict: "user_id,log_date,source" },
  );

  if (metricError) return { error: metricError.message };

  const { error: connError } = await supabase
    .from("wearable_connections")
    .update({ last_synced_at: new Date().toISOString(), status: "connected" })
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (connError) return { error: connError.message };

  revalidatePath("/wearables");
  return {};
}

export async function connectWearableAction(provider: "mock" | "google_health"): Promise<void> {
  await connectWearable(provider);
}

export async function disconnectWearableAction(
  provider: "mock" | "google_health",
): Promise<void> {
  await disconnectWearable(provider);
}

export async function syncWearableNowAction(provider: "mock" | "google_health"): Promise<void> {
  await syncWearableNow(provider);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayLogDate, yesterdayLogDate } from "@/lib/check-in/queries";
import { getUserTimeZone } from "@/lib/check-in/timezone";
import type { WearableErrorCode } from "@/lib/wearables/errors";
import { syncGoogleHealthGlance } from "@/lib/wearables/google-health/sync";
import { getProvider } from "@/lib/wearables/providers";
import {
  mergeWearableDbRow,
  type WearableMetricSnapshot,
  wearableSnapshotToDbRow,
} from "@/lib/wearables/types";

type ActionResult = { error?: WearableErrorCode };

const WEARABLE_METRIC_COLUMNS =
  "sleep_minutes, sleep_wake_minutes, sleep_efficiency, resting_hr, hrv_ms, steps, active_minutes, spo2, respiratory_rate, skin_temp_c";

async function upsertGoogleHealthDay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  logDate: string,
  metrics: WearableMetricSnapshot,
  merge = false,
): Promise<string | undefined> {
  if (merge) {
    const { data: existing } = await supabase
      .from("wearable_daily_metrics")
      .select(WEARABLE_METRIC_COLUMNS)
      .eq("user_id", userId)
      .eq("log_date", logDate)
      .eq("source", "google_health")
      .maybeSingle();

    const merged = mergeWearableDbRow(metrics, existing);
    const { error } = await supabase.from("wearable_daily_metrics").upsert(
      {
        ...merged,
        user_id: userId,
        log_date: logDate,
        source: "google_health",
      },
      { onConflict: "user_id,log_date,source" },
    );

    return error?.message;
  }

  const { error } = await supabase
    .from("wearable_daily_metrics")
    .upsert(wearableSnapshotToDbRow(userId, logDate, "google_health", metrics), {
      onConflict: "user_id,log_date,source",
    });

  return error?.message;
}

function hasSyncedData(today: WearableMetricSnapshot, yesterday: WearableMetricSnapshot): boolean {
  return (
    today.sleepMinutes != null ||
    today.restingHr != null ||
    today.hrvMs != null ||
    today.spo2 != null ||
    today.respiratoryRate != null ||
    yesterday.steps != null ||
    yesterday.activeMinutes != null
  );
}

export async function connectMockWearable(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "not_signed_in" };

  const { error } = await supabase.from("wearable_connections").upsert(
    {
      user_id: user.id,
      provider: "mock",
      status: "connected",
      token_encrypted: null,
      metadata: { connected_at: new Date().toISOString() },
    },
    { onConflict: "user_id,provider" },
  );

  if (error) return { error: "save_failed" };

  revalidatePath("/wearables");
  return {};
}

export async function disconnectWearable(provider: "mock" | "google_health"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "not_signed_in" };

  const { error } = await supabase
    .from("wearable_connections")
    .update({ status: "disconnected", token_encrypted: null })
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) return { error: "save_failed" };

  revalidatePath("/wearables");
  revalidatePath("/");
  return {};
}

export async function syncWearableNow(provider: "mock" | "google_health"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "not_signed_in" };

  const today = todayLogDate(await getUserTimeZone());
  const yesterday = yesterdayLogDate(today);

  if (provider === "google_health") {
    const sync = await syncGoogleHealthGlance(supabase, user.id, today, yesterday);
    if (sync.error) return { error: sync.error };

    const todayError = await upsertGoogleHealthDay(
      supabase,
      user.id,
      today,
      sync.today.metrics,
      true,
    );
    if (todayError) return { error: "save_failed" };

    const yesterdayError = await upsertGoogleHealthDay(
      supabase,
      user.id,
      yesterday,
      sync.yesterday.metrics,
      true,
    );
    if (yesterdayError) return { error: "save_failed" };

    if (!hasSyncedData(sync.today.metrics, sync.yesterday.metrics) && sync.warnings.length) {
      return { error: "google_no_data" };
    }

    await supabase
      .from("wearable_connections")
      .update({ last_synced_at: new Date().toISOString(), status: "connected" })
      .eq("user_id", user.id)
      .eq("provider", provider);

    revalidatePath("/wearables");
    revalidatePath("/");
    return {};
  }

  const metrics = await getProvider(provider).syncDailyMetrics(user.id, today);

  const { error: metricError } = await supabase
    .from("wearable_daily_metrics")
    .upsert(wearableSnapshotToDbRow(user.id, today, provider, metrics), {
      onConflict: "user_id,log_date,source",
    });

  if (metricError) return { error: "save_failed" };

  await supabase
    .from("wearable_connections")
    .update({ last_synced_at: new Date().toISOString(), status: "connected" })
    .eq("user_id", user.id)
    .eq("provider", provider);

  revalidatePath("/wearables");
  revalidatePath("/");
  return {};
}

export async function connectMockWearableAction(): Promise<void> {
  await connectMockWearable();
}

export async function disconnectWearableAction(
  provider: "mock" | "google_health",
): Promise<void> {
  await disconnectWearable(provider);
}

export async function syncWearableNowAction(
  provider: "mock" | "google_health",
): Promise<void> {
  const result = await syncWearableNow(provider);
  if (result.error) {
    redirect(`/wearables?error=${result.error}`);
  }
  redirect("/wearables?synced=1");
}

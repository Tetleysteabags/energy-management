import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchHrvForDay,
  fetchRestingHrForDay,
  fetchSleepMinutesForWakeDate,
  fetchStepsForDay,
} from "./api";
import { refreshGoogleHealthTokens } from "./oauth";
import type { WearableMetricSnapshot } from "@/lib/wearables/types";
import {
  decryptTokenPayload,
  encryptTokenPayload,
  type StoredWearableTokens,
} from "@/lib/wearables/token-crypto";

type SyncResult = { metrics: WearableMetricSnapshot; error?: string };

async function loadTokens(
  supabase: SupabaseClient,
  userId: string,
): Promise<StoredWearableTokens | null> {
  const { data, error } = await supabase
    .from("wearable_connections")
    .select("token_encrypted, status")
    .eq("user_id", userId)
    .eq("provider", "google_health")
    .maybeSingle();

  if (error || !data?.token_encrypted || data.status !== "connected") {
    return null;
  }

  if (data.token_encrypted === "pending_oauth") {
    return null;
  }

  return decryptTokenPayload(data.token_encrypted);
}

async function persistTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: StoredWearableTokens,
): Promise<void> {
  await supabase
    .from("wearable_connections")
    .update({
      token_encrypted: encryptTokenPayload(tokens),
      status: "connected",
    })
    .eq("user_id", userId)
    .eq("provider", "google_health");
}

export async function syncGoogleHealthMetrics(
  supabase: SupabaseClient,
  userId: string,
  logDate: string,
): Promise<SyncResult> {
  const existing = await loadTokens(supabase, userId);
  if (!existing) {
    return {
      metrics: emptySnapshot(),
      error: "Google Health is not connected. Tap Connect and approve read-only access.",
    };
  }

  let tokens = existing;
  try {
    tokens = await refreshGoogleHealthTokens(existing);
    if (tokens.access_token !== existing.access_token) {
      await persistTokens(supabase, userId, tokens);
    }
  } catch (error) {
    await supabase
      .from("wearable_connections")
      .update({ status: "stale" })
      .eq("user_id", userId)
      .eq("provider", "google_health");

    return {
      metrics: emptySnapshot(),
      error: error instanceof Error ? error.message : "Token refresh failed — reconnect Google Health.",
    };
  }

  const accessToken = tokens.access_token;

  const [sleepMinutes, steps, restingHr, hrvMs] = await Promise.all([
    fetchSleepMinutesForWakeDate(accessToken, logDate).catch(() => null),
    fetchStepsForDay(accessToken, logDate).catch(() => null),
    fetchRestingHrForDay(accessToken, logDate).catch(() => null),
    fetchHrvForDay(accessToken, logDate).catch(() => null),
  ]);

  return {
    metrics: {
      sleepMinutes,
      restingHr,
      hrvMs,
      steps,
      activeMinutes: null,
      spo2: null,
      skinTempC: null,
    },
  };
}

function emptySnapshot(): WearableMetricSnapshot {
  return {
    sleepMinutes: null,
    restingHr: null,
    hrvMs: null,
    steps: null,
    activeMinutes: null,
    spo2: null,
    skinTempC: null,
  };
}

export { encryptTokenPayload };

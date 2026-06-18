import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchActiveMinutesForDay,
  fetchHrvForDay,
  fetchRespiratoryRateForDay,
  fetchRestingHrForDay,
  fetchSleepForWakeDate,
  fetchSpo2ForDay,
  fetchStepsForDay,
} from "./api";
import { refreshGoogleHealthTokens } from "./oauth";
import { emptyWearableSnapshot, type WearableMetricSnapshot } from "@/lib/wearables/types";
import {
  decryptTokenPayload,
  encryptTokenPayload,
  type StoredWearableTokens,
} from "@/lib/wearables/token-crypto";

type SyncResult = {
  metrics: WearableMetricSnapshot;
  error?: string;
  warnings?: string[];
};

export type GoogleHealthDaySync = {
  logDate: string;
  metrics: WearableMetricSnapshot;
};

export type GoogleHealthGlanceSync = {
  today: GoogleHealthDaySync;
  yesterday: GoogleHealthDaySync;
  error?: string;
  warnings: string[];
};

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

async function resolveAccessToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ accessToken: string } | { error: string }> {
  const existing = await loadTokens(supabase, userId);
  if (!existing) {
    return {
      error: "Google Health is not connected. Tap Connect and approve read-only access.",
    };
  }

  try {
    const tokens = await refreshGoogleHealthTokens(existing);
    if (tokens.access_token !== existing.access_token) {
      await persistTokens(supabase, userId, tokens);
    }
    return { accessToken: tokens.access_token };
  } catch (error) {
    await supabase
      .from("wearable_connections")
      .update({ status: "stale" })
      .eq("user_id", userId)
      .eq("provider", "google_health");

    return {
      error:
        error instanceof Error ? error.message : "Token refresh failed — reconnect Google Health.",
    };
  }
}

async function fetchDayMetrics(
  accessToken: string,
  logDate: string,
  kind: "overnight" | "daytime",
): Promise<{ metrics: WearableMetricSnapshot; warnings: string[] }> {
  const warnings: string[] = [];

  if (kind === "overnight") {
    const [sleep, restingHr, hrvMs, spo2, respiratoryRate] = await Promise.all([
      fetchSleepForWakeDate(accessToken, logDate).catch((error) => {
        warnings.push(error instanceof Error ? error.message : "Sleep fetch failed");
        return { sleepMinutes: null, sleepWakeMinutes: null, sleepEfficiency: null };
      }),
      fetchRestingHrForDay(accessToken, logDate).catch((error) => {
        warnings.push(error instanceof Error ? error.message : "Resting HR fetch failed");
        return null;
      }),
      fetchHrvForDay(accessToken, logDate).catch((error) => {
        warnings.push(error instanceof Error ? error.message : "HRV fetch failed");
        return null;
      }),
      fetchSpo2ForDay(accessToken, logDate).catch((error) => {
        warnings.push(error instanceof Error ? error.message : "SpO₂ fetch failed");
        return null;
      }),
      fetchRespiratoryRateForDay(accessToken, logDate).catch((error) => {
        warnings.push(error instanceof Error ? error.message : "Respiratory rate fetch failed");
        return null;
      }),
    ]);

    return {
      metrics: {
        ...emptyWearableSnapshot(),
        sleepMinutes: sleep.sleepMinutes,
        sleepWakeMinutes: sleep.sleepWakeMinutes,
        sleepEfficiency: sleep.sleepEfficiency,
        restingHr,
        hrvMs,
        spo2,
        respiratoryRate,
      },
      warnings,
    };
  }

  const [steps, activeMinutes] = await Promise.all([
    fetchStepsForDay(accessToken, logDate).catch((error) => {
      warnings.push(error instanceof Error ? error.message : "Steps fetch failed");
      return null;
    }),
    fetchActiveMinutesForDay(accessToken, logDate).catch((error) => {
      warnings.push(error instanceof Error ? error.message : "Active minutes fetch failed");
      return null;
    }),
  ]);

  return {
    metrics: { ...emptyWearableSnapshot(), steps, activeMinutes },
    warnings,
  };
}

/** Sync overnight recovery for today and daytime activity for yesterday. */
export async function syncGoogleHealthGlance(
  supabase: SupabaseClient,
  userId: string,
  today: string,
  yesterday: string,
): Promise<GoogleHealthGlanceSync> {
  const tokenResult = await resolveAccessToken(supabase, userId);
  if ("error" in tokenResult) {
    return {
      today: { logDate: today, metrics: emptyWearableSnapshot() },
      yesterday: { logDate: yesterday, metrics: emptyWearableSnapshot() },
      error: tokenResult.error,
      warnings: [],
    };
  }

  const [todayResult, yesterdayResult] = await Promise.all([
    fetchDayMetrics(tokenResult.accessToken, today, "overnight"),
    fetchDayMetrics(tokenResult.accessToken, yesterday, "daytime"),
  ]);

  const warnings = [...todayResult.warnings, ...yesterdayResult.warnings];

  return {
    today: { logDate: today, metrics: todayResult.metrics },
    yesterday: { logDate: yesterday, metrics: yesterdayResult.metrics },
    warnings,
  };
}

/** @deprecated Prefer syncGoogleHealthGlance — kept for single-day callers. */
export async function syncGoogleHealthMetrics(
  supabase: SupabaseClient,
  userId: string,
  logDate: string,
): Promise<SyncResult> {
  const glance = await syncGoogleHealthGlance(supabase, userId, logDate, logDate);
  if (glance.error) {
    return { metrics: emptyWearableSnapshot(), error: glance.error, warnings: glance.warnings };
  }

  return {
    metrics: {
      ...emptyWearableSnapshot(),
      ...glance.today.metrics,
      steps: glance.today.metrics.steps ?? glance.yesterday.metrics.steps,
      activeMinutes:
        glance.today.metrics.activeMinutes ?? glance.yesterday.metrics.activeMinutes,
    },
    warnings: glance.warnings,
  };
}

export { encryptTokenPayload };

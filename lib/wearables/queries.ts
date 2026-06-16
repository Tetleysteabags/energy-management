import { createClient } from "@/lib/supabase/server";
import { todayLogDate, yesterdayLogDate } from "@/lib/check-in/queries";

export type WearableGlance = {
  lastNightDate: string;
  yesterdayDate: string;
  sleepMinutes: number | null;
  restingHr: number | null;
  hrvMs: number | null;
  steps: number | null;
  activeMinutes: number | null;
  note: string | null;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function buildNote(
  lastNight: { sleep_minutes: number | null; hrv_ms: number | null },
  recentSleep: number[],
): string | null {
  const parts: string[] = [];

  if (lastNight.hrv_ms == null) {
    parts.push("HRV hasn't synced yet");
  }

  if (lastNight.sleep_minutes != null && recentSleep.length >= 5) {
    const usual = median(recentSleep);
    if (lastNight.sleep_minutes < usual * 0.9) {
      parts.push("sleep a little below your usual");
    }
  }

  if (!parts.length) return null;

  const sentence = parts.join("; ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

/**
 * Home wearable card: row T = overnight recovery; row T−1 = daytime activity.
 * See docs/ui-ux-spec.md § Wearable timing convention.
 */
export async function getWearableGlance(
  today = todayLogDate(),
): Promise<WearableGlance | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const yesterday = yesterdayLogDate(today);

  const [{ data: lastNightRow }, { data: yesterdayRow }] = await Promise.all([
    supabase
      .from("wearable_daily_metrics")
      .select("log_date, sleep_minutes, resting_hr, hrv_ms")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("wearable_daily_metrics")
      .select("log_date, steps, active_minutes")
      .eq("user_id", user.id)
      .eq("log_date", yesterday)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lookbackStart = new Date(`${today}T12:00:00`);
  lookbackStart.setDate(lookbackStart.getDate() - 21);
  const lookbackIso = lookbackStart.toISOString().slice(0, 10);

  const { data: recentRows } = await supabase
    .from("wearable_daily_metrics")
    .select("sleep_minutes")
    .eq("user_id", user.id)
    .gte("log_date", lookbackIso)
    .lt("log_date", today)
    .not("sleep_minutes", "is", null);

  const recentSleep = (recentRows ?? [])
    .map((row) => row.sleep_minutes)
    .filter((value): value is number => value != null);

  if (!lastNightRow && !yesterdayRow) {
    return {
      lastNightDate: today,
      yesterdayDate: yesterday,
      sleepMinutes: null,
      restingHr: null,
      hrvMs: null,
      steps: null,
      activeMinutes: null,
      note: "Wearable data hasn't synced yet.",
    };
  }

  return {
    lastNightDate: today,
    yesterdayDate: yesterday,
    sleepMinutes: lastNightRow?.sleep_minutes ?? null,
    restingHr: lastNightRow?.resting_hr ?? null,
    hrvMs: lastNightRow?.hrv_ms ?? null,
    steps: yesterdayRow?.steps ?? null,
    activeMinutes: yesterdayRow?.active_minutes ?? null,
    note: lastNightRow ? buildNote(lastNightRow, recentSleep) : null,
  };
}

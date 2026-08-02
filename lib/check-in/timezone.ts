import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_TIME_ZONE, resolveTimeZone } from "@/lib/check-in/log-date";

/**
 * The signed-in user's IANA timezone, used to decide which calendar day a
 * check-in belongs to. Cached per request so the extra profile read costs one
 * query no matter how many components ask.
 *
 * Falls back to UTC when unknown; `TimeZoneSync` in the dashboard layout fills
 * `profiles.timezone` in from the browser on first load and whenever it changes.
 */
export const getUserTimeZone = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return FALLBACK_TIME_ZONE;

  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();

  return resolveTimeZone(data?.timezone);
});

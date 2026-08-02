"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/check-in/log-date";

type ActionResult = { error?: string };

/**
 * Records the browser's IANA timezone so log dates land on the right calendar
 * day. Called from the dashboard layout only when the reported zone differs
 * from the stored one, so it does not re-render in a loop.
 */
export async function saveTimeZone(timeZone: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };
  if (!isValidTimeZone(timeZone)) return { error: "Unrecognised timezone." };

  const { error } = await supabase
    .from("profiles")
    .update({ timezone: timeZone })
    .eq("id", user.id);

  if (error) return { error: error.message };

  // Everything date-derived is now potentially stale.
  revalidatePath("/", "layout");
  return {};
}

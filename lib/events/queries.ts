import { createClient } from "@/lib/supabase/server";
import type { EventRow } from "./types";

export async function getRecentEvents(limit = 50): Promise<EventRow[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  return (data as EventRow[]) ?? [];
}

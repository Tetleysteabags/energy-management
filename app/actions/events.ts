"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string };

export async function addQuickEvent({
  eventType,
  label,
}: {
  eventType: string;
  label: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("events").insert({
    user_id: user.id,
    event_type: eventType,
    label,
    occurred_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/events");
  return {};
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/events");
  return {};
}

export async function deleteEventAction(eventId: string): Promise<void> {
  await deleteEvent(eventId);
}

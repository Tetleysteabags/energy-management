"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EVENT_DURATION } from "@/lib/events/types";

type ActionResult = { error?: string; id?: string };

function revalidateEventPaths(): void {
  revalidatePath("/");
  revalidatePath("/events");
}

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

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      event_type: eventType,
      label,
      occurred_at: new Date().toISOString(),
      duration_minutes: DEFAULT_EVENT_DURATION[eventType] ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidateEventPaths();
  return { id: data.id };
}

export async function updateEventDuration(
  eventId: string,
  durationMinutes: number | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("events")
    .update({ duration_minutes: durationMinutes })
    .eq("id", eventId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidateEventPaths();
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

  revalidateEventPaths();
  return {};
}

export async function deleteEventAction(eventId: string): Promise<void> {
  await deleteEvent(eventId);
}

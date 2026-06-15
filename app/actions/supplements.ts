"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string };

export async function saveSupplementIntake({
  logDate,
  intake,
}: {
  logDate: string;
  intake: { supplementId: string; taken: boolean }[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const rows = intake.map((item) => ({
    user_id: user.id,
    log_date: logDate,
    supplement_id: item.supplementId,
    taken: item.taken,
  }));

  const { error } = await supabase.from("daily_supplement_intake").upsert(rows, {
    onConflict: "user_id,log_date,supplement_id",
  });

  if (error) return { error: error.message };

  revalidatePath("/check-in/evening");
  return {};
}

export async function addSupplement(name: string): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };

  const { data, error } = await supabase
    .from("supplements")
    .insert({ user_id: user.id, name: trimmed })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/check-in/evening");
  revalidatePath("/settings/supplements");
  return { id: data.id };
}

export async function removeSupplement(supplementId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("supplements")
    .update({ is_active: false })
    .eq("id", supplementId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/check-in/evening");
  revalidatePath("/settings/supplements");
  return {};
}

export async function removeSupplementAction(supplementId: string): Promise<void> {
  await removeSupplement(supplementId);
}

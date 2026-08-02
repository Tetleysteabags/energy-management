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

  if (!intake.length) return {};

  // supplement_id arrives from the client, and RLS on this table only checks
  // user_id — so confirm each one is actually theirs. Unknown ids are dropped
  // rather than rejected: the usual cause is a stale page after a removal.
  const { data: owned } = await supabase
    .from("supplements")
    .select("id")
    .eq("user_id", user.id)
    .in("id", [...new Set(intake.map((item) => item.supplementId))]);

  const ownedIds = new Set((owned ?? []).map((row) => row.id));
  const rows = intake
    .filter((item) => ownedIds.has(item.supplementId))
    .map((item) => ({
      user_id: user.id,
      log_date: logDate,
      supplement_id: item.supplementId,
      taken: item.taken,
    }));

  if (!rows.length) return {};

  const { error } = await supabase.from("daily_supplement_intake").upsert(rows, {
    onConflict: "user_id,log_date,supplement_id",
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/check-in/evening");
  revalidatePath("/analysis");
  revalidatePath("/trends");
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

  revalidatePath("/");
  revalidatePath("/check-in/evening");
  revalidatePath("/settings/supplements");
  revalidatePath("/analysis");
  revalidatePath("/trends");
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

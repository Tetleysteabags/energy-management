"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DELETE_CONFIRMATION, isDeletionConfirmed } from "@/lib/account/deletion";
import { reportError } from "@/lib/observability/report-error";

type ActionResult = { error?: string };

/**
 * Erases the account and every row belonging to it.
 *
 * The work happens in the `delete_own_account` Postgres function, which can
 * only ever act on `auth.uid()` — so this action cannot be aimed at anyone else
 * even if it were called with forged input.
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be signed in." };

  if (!isDeletionConfirmed(confirmation)) {
    return { error: `Type ${DELETE_CONFIRMATION} to confirm.` };
  }

  const { error } = await supabase.rpc("delete_own_account");

  if (error) {
    // A failed erasure is a compliance problem, not just a bad page.
    await reportError({ error, route: "/settings/account" });
    return { error: "Couldn't delete the account just now. Try again in a moment." };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return {};
}

export async function deleteAccountAndRedirect(confirmation: string): Promise<ActionResult> {
  const result = await deleteAccount(confirmation);
  if (result.error) return result;
  redirect("/how-it-works?deleted=1");
}

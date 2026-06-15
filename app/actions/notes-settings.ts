"use server";

import { revalidatePath } from "next/cache";
import { updateLlmNotesEnabled } from "@/app/actions/settings";

export async function toggleLlmNotes(current: boolean) {
  await updateLlmNotesEnabled(!current);
  revalidatePath("/settings/notes");
}

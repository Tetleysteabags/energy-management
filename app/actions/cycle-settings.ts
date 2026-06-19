"use server";

import { updateTrackCycle } from "@/app/actions/settings";

export async function toggleTrackCycle(current: boolean) {
  await updateTrackCycle(!current);
}

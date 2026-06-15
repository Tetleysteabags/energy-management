import { NextResponse } from "next/server";
import { connectWearableAction } from "@/app/actions/wearables";

export async function GET() {
  // Slice 6: exchange OAuth code for tokens here, then store encrypted token.
  await connectWearableAction("google_health");
  return NextResponse.redirect(new URL("/wearables", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}

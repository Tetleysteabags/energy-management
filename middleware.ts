import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/trends",
    "/more",
    "/analysis",
    "/explore",
    "/events",
    "/wearables",
    "/import",
    "/reports/:path*",
    "/settings/:path*",
    "/check-in/:path*",
    "/login",
    "/signup",
    "/auth/callback",
    "/help",
    "/dashboard/:path*",
    "/api/reports/:path*",
  ],
};

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildGoogleHealthAuthorizeUrl } from "@/lib/wearables/google-health/oauth";
import { isGoogleHealthConfigured } from "@/lib/wearables/google-health/config";

const STATE_COOKIE = "gh_oauth_state";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  if (!isGoogleHealthConfigured()) {
    return NextResponse.redirect(new URL("/wearables?error=google_not_configured", origin));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // read-only in this step
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const state = randomBytes(24).toString("base64url");
  const authorizeUrl = buildGoogleHealthAuthorizeUrl(origin, state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}

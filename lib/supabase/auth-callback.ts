import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}

/**
 * A freshly-invited account has no password and no linked sign-in provider —
 * dropping it straight into the dashboard leaves no way back in once the
 * session expires. Send invite links to /welcome, which sets one up.
 */
function defaultNextForType(type: EmailOtpType | null): string {
  return type === "invite" ? "/welcome" : "/";
}

export async function handleAuthCallback(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const oauthError = searchParams.get("error");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"), defaultNextForType(type));

  if (oauthError) {
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
  }

  const successRedirect = NextResponse.redirect(new URL(next, origin));
  // A dead recovery link should offer a new one, not send people to sign-in
  // with a password they already know they've forgotten.
  const emailFailureRedirect = NextResponse.redirect(
    new URL(
      type === "recovery"
        ? "/forgot-password?error=reset_link_invalid"
        : "/login?error=confirmation_link_invalid",
      origin,
    ),
  );
  const authFailureRedirect = NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", origin),
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            successRedirect.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? authFailureRedirect : successRedirect;
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? emailFailureRedirect : successRedirect;
  }

  return authFailureRedirect;
}

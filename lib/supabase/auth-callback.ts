import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export async function handleAuthCallback(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  const successRedirect = NextResponse.redirect(new URL(next, origin));
  const failureRedirect = NextResponse.redirect(
    new URL("/login?error=confirmation_link_invalid", origin),
  );

  if (!code && !(tokenHash && type)) {
    return failureRedirect;
  }

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
    return error ? failureRedirect : successRedirect;
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return error ? failureRedirect : successRedirect;
  }

  return failureRedirect;
}

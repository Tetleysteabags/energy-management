import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  // Carries the CSP nonce through, so Next can tag its bootstrap scripts.
  const nextOptions = requestHeaders
    ? { request: { headers: requestHeaders } }
    : { request };

  let supabaseResponse = NextResponse.next(nextOptions);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next(nextOptions);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Signed-in users have no use for these, so they get bounced home.
  // `/reset-password` is deliberately absent: the recovery link signs the user
  // in first, so redirecting authenticated users away would break the flow.
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth/callback");
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/welcome") ||
    pathname.startsWith("/trends") ||
    pathname.startsWith("/more") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/analysis") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/wearables") ||
    pathname.startsWith("/import") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/check-in") ||
    pathname.startsWith("/dashboard");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    // First-time visitors land on the calm intro; deep links still go to sign-in.
    url.pathname = pathname === "/" ? "/how-it-works" : "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { buildContentSecurityPolicy, generateNonce } from "@/lib/security/csp";

/**
 * Routes that need a Supabase session refresh. Deliberately narrower than the
 * matcher below: the CSP applies to every page, but `getUser()` is a network
 * round-trip and public pages have no session to refresh.
 */
const SESSION_ROUTES = [
  "/",
  "/welcome",
  "/trends",
  "/more",
  "/help",
  "/analysis",
  "/explore",
  "/events",
  "/wearables",
  "/import",
  "/reports",
  "/settings",
  "/check-in",
  "/dashboard",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/api/reports",
];

function needsSession(pathname: string): boolean {
  // "/" is the dashboard home, matched exactly — every path starts with "/",
  // so treating it as a prefix would pull in the public pages too.
  if (pathname === "/") return true;

  return SESSION_ROUTES.some(
    (route) => route !== "/" && (pathname === route || pathname.startsWith(`${route}/`)),
  );
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce);

  // Next reads the nonce back off these request headers to tag its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = needsSession(request.nextUrl.pathname)
    ? await updateSession(request, requestHeaders)
    : NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which are served
     * straight from the CDN and carry no HTML to protect.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

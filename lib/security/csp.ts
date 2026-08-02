/**
 * Content Security Policy, built per request so each response carries a fresh
 * nonce. Next.js reads the nonce off the request's CSP header and stamps it on
 * its own bootstrap scripts, which is what lets `script-src` stay strict
 * instead of falling back to 'unsafe-inline'.
 */

/** The Supabase project origin, so the browser client can reach it under `connect-src`. */
function supabaseOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** The access-request form posts here from the public page. */
const FORMSPREE_ORIGIN = "https://formspree.io";

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildContentSecurityPolicy(nonce: string): string {
  // React uses eval in development to rebuild server stacks in the browser.
  const isDev = process.env.NODE_ENV === "development";
  const supabase = supabaseOrigin();

  const connectSrc = ["'self'", supabase, supabase?.replace("https://", "wss://"), FORMSPREE_ORIGIN]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Next and Tailwind both emit inline style attributes; nonce-ing styles
    // breaks them for no real gain, since inline CSS is a far smaller risk.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    // next/font self-hosts the font files at build time.
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    `form-action 'self' ${FORMSPREE_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

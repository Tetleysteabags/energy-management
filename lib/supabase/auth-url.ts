/** The app's public origin, used to build links Supabase redirects back to. */
function siteOrigin(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  return siteUrl.replace(/\/$/, "");
}

/** Where Supabase should send users after email confirmation / magic links. */
export function getAuthCallbackUrl(): string {
  return `${siteOrigin()}/auth/callback`;
}

/**
 * Where a password-reset link lands. The callback establishes the recovery
 * session first, then forwards to the page that actually sets the new password.
 */
export function getPasswordResetUrl(): string {
  return `${getAuthCallbackUrl()}?next=${encodeURIComponent("/reset-password")}`;
}

/** Where Supabase should send users after email confirmation / magic links. */
export function getAuthCallbackUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  return `${siteUrl.replace(/\/$/, "")}/auth/callback`;
}

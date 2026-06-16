/** Human-friendly auth errors surfaced from Supabase responses. */
export function formatAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit")) {
    return "Too many emails sent in a short time. Wait about an hour, then use Resend once — or continue with Google.";
  }

  return message;
}

/** Supabase returns an empty identities array on repeat sign-up (no new email sent). */
export function isRepeatedSignup(user: { identities?: { id: string }[] } | null): boolean {
  return Boolean(user && (user.identities?.length ?? 0) === 0);
}

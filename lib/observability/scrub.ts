/**
 * Redaction for anything on its way into a crash log.
 *
 * Error messages in this app can quote user input — a failed insert can echo a
 * note, a validation message can quote a value. None of that belongs in a
 * diagnostics table, so everything is scrubbed before it is stored, and the
 * message is capped to match the column constraint.
 */

/** Matches the CHECK constraint on error_reports.message. */
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_ROUTE_LENGTH = 512;
export const MAX_USER_AGENT_LENGTH = 512;

const REDACTIONS: { pattern: RegExp; replacement: string }[] = [
  // Email addresses.
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: "[email]" },
  // JWTs and Supabase keys.
  { pattern: /eyJ[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+){0,2}/g, replacement: "[token]" },
  // Authorization headers quoted into a message.
  { pattern: /\b[Bb]earer\s+[A-Za-z0-9._-]+/g, replacement: "[token]" },
  // Our own wearable token envelope: v1:iv:tag:ciphertext.
  { pattern: /\bv1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/g, replacement: "[token]" },
  // Google OAuth client secrets and refresh tokens.
  { pattern: /\bGOCSPX-[A-Za-z0-9_-]+/g, replacement: "[secret]" },
  { pattern: /\b1\/\/[A-Za-z0-9_-]{20,}/g, replacement: "[token]" },
  // Runs of digits long enough to be a phone number or an id typed by a person.
  { pattern: /\b\d{9,}\b/g, replacement: "[number]" },
];

export function scrub(text: string, maxLength = MAX_MESSAGE_LENGTH): string {
  let output = text;
  for (const { pattern, replacement } of REDACTIONS) {
    output = output.replace(pattern, replacement);
  }
  return output.length > maxLength ? `${output.slice(0, maxLength - 1)}…` : output;
}

/**
 * Keeps the path, drops the query string. `?date=2026-06-01` is harmless, but
 * an allowlist that has to be maintained is not, so nothing is kept.
 */
export function scrubRoute(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    // Handles both absolute URLs and bare paths.
    const url = new URL(value, "http://x");
    return scrub(url.pathname, MAX_ROUTE_LENGTH);
  } catch {
    return scrub(value.split("?")[0], MAX_ROUTE_LENGTH);
  }
}

/** Turns anything thrown into a message worth storing. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack?.trim() || `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

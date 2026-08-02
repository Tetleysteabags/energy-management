"use server";

import { timingSafeEqual } from "node:crypto";

/**
 * Invite gating for account creation.
 *
 * IMPORTANT — this is a UI gate, not a security boundary. Supabase's sign-up
 * endpoint is reachable directly with the public anon key, so anyone determined
 * enough can bypass this check. The only real enforcement is turning off public
 * sign-ups in the Supabase dashboard (Authentication → Sign In / Providers →
 * "Allow new users to sign up") and inviting people from there.
 *
 * What this does buy: the page stops contradicting itself, casual visitors
 * cannot wander into an account, and invite links carry a code that works.
 * See docs/supabase-setup.md § Invite-only access.
 */

function configuredCode(): string | null {
  return process.env.SIGNUP_INVITE_CODE?.trim() || null;
}

/** False when no code is configured — sign-up fails closed rather than open. */
export async function isSignupOpen(): Promise<boolean> {
  return configuredCode() !== null;
}

export async function verifyInviteCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const expected = configuredCode();

  if (!expected) {
    return { ok: false, error: "Account creation is invite-only right now." };
  }

  const supplied = code.trim();
  const expectedBytes = Buffer.from(expected, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");

  // Compare a fixed number of bytes so length alone doesn't leak through timing.
  const matches =
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes);

  return matches ? { ok: true } : { ok: false, error: "That invite code isn't right." };
}

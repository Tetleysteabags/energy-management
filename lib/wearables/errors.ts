/**
 * Wearable sync failures travel as codes, not as text.
 *
 * The underlying messages come from Postgres and the Google API, and used to be
 * put straight into a redirect URL and rendered to the user. Codes keep internal
 * detail server-side and keep the wording in one place.
 */

export const WEARABLE_ERROR_MESSAGES = {
  not_signed_in: "You need to be signed in.",
  google_not_connected:
    "Google Health isn't connected. Tap Connect and approve read-only access.",
  google_token_refresh:
    "Google sign-in has expired. Reconnect Google Health to keep syncing.",
  google_no_data:
    "Connected, but Google Health returned no data yet. Open the Fitbit app to sync your watch, then try again.",
  save_failed: "Synced, but saving the readings failed. Try again in a moment.",
  sync_failed: "Couldn't sync just now. Try again in a moment.",
  google_denied: "Google access was not approved. Nothing was connected.",
  google_state_mismatch: "That connect attempt expired. Please try again.",
  google_token_exchange: "Google sign-in did not complete. Try Connect again.",
  google_not_configured:
    "Wearable syncing isn't set up on the server yet. Ask whoever runs the app.",
} as const;

export type WearableErrorCode = keyof typeof WEARABLE_ERROR_MESSAGES;

export function isWearableErrorCode(value: string | undefined): value is WearableErrorCode {
  return value != null && value in WEARABLE_ERROR_MESSAGES;
}

/** Never renders a raw upstream string — an unknown code falls back to the generic message. */
export function wearableErrorMessage(value: string | undefined): string | null {
  if (!value) return null;
  return isWearableErrorCode(value)
    ? WEARABLE_ERROR_MESSAGES[value]
    : WEARABLE_ERROR_MESSAGES.sync_failed;
}

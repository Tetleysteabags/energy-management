import { isWearableTokenSecretConfigured } from "@/lib/wearables/token-crypto";

export const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_HEALTH_API_BASE = "https://health.googleapis.com/v4";

export const GOOGLE_HEALTH_SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
] as const;

export function getGoogleHealthClientId(): string | null {
  return process.env.GOOGLE_HEALTH_CLIENT_ID ?? process.env.GOOGLE_OAUTH_CLIENT_ID ?? null;
}

export function getGoogleHealthClientSecret(): string | null {
  return process.env.GOOGLE_HEALTH_CLIENT_SECRET ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? null;
}

/**
 * Also requires the token secret: without it the OAuth callback would get all
 * the way to storing tokens and only then throw, leaving the user staring at a
 * failed connect with no explanation.
 */
export function isGoogleHealthConfigured(): boolean {
  return Boolean(
    getGoogleHealthClientId() &&
      getGoogleHealthClientSecret() &&
      isWearableTokenSecretConfigured(),
  );
}

export function getGoogleHealthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/wearables/google/callback`;
}

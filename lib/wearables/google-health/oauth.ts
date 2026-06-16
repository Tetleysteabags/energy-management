import {
  GOOGLE_HEALTH_SCOPES,
  GOOGLE_OAUTH_AUTHORIZE_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  getGoogleHealthClientId,
  getGoogleHealthClientSecret,
  getGoogleHealthRedirectUri,
} from "./config";
import type { StoredWearableTokens } from "@/lib/wearables/token-crypto";

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
  error?: string;
  error_description?: string;
};

export function buildGoogleHealthAuthorizeUrl(origin: string, state: string): string {
  const clientId = getGoogleHealthClientId();
  if (!clientId) {
    throw new Error("Google Health OAuth is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleHealthRedirectUri(origin),
    response_type: "code",
    scope: GOOGLE_HEALTH_SCOPES.join(" "),
    access_type: "offline",
    include_granted_scopes: "false",
    state,
  });

  return `${GOOGLE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGoogleHealthCode(
  code: string,
  origin: string,
): Promise<StoredWearableTokens> {
  const clientId = getGoogleHealthClientId();
  const clientSecret = getGoogleHealthClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Google Health OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getGoogleHealthRedirectUri(origin),
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Token exchange failed.");
  }

  if (!json.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke app access and try again.");
  }

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000 - 60_000,
    scope: json.scope,
  };
}

export async function refreshGoogleHealthTokens(
  tokens: StoredWearableTokens,
): Promise<StoredWearableTokens> {
  if (tokens.expires_at > Date.now()) {
    return tokens;
  }

  const clientId = getGoogleHealthClientId();
  const clientSecret = getGoogleHealthClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Google Health OAuth is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Token refresh failed.");
  }

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? tokens.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000 - 60_000,
    scope: json.scope ?? tokens.scope,
  };
}

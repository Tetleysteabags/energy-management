import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export type StoredWearableTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
};

/** Long enough that a hand-typed value can't be trivially brute-forced. */
const MIN_SECRET_LENGTH = 32;

/**
 * The key is derived from a secret that exists only for this purpose.
 *
 * It used to fall back to SUPABASE_SERVICE_ROLE_KEY, which tied every stored
 * refresh token to a credential you would want to rotate — and rotating it
 * would have silently made all of them undecryptable, breaking wearable sync
 * with no obvious cause. Requiring a dedicated secret keeps the two lifecycles
 * apart.
 */
function encryptionKey(): Buffer {
  const secret = process.env.WEARABLE_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      "WEARABLE_TOKEN_SECRET is required to store wearable tokens. Generate one with `openssl rand -base64 32` and set it in Vercel — see docs/supabase-setup.md.",
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `WEARABLE_TOKEN_SECRET must be at least ${MIN_SECRET_LENGTH} characters. Generate one with \`openssl rand -base64 32\`.`,
    );
  }

  if (secret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "WEARABLE_TOKEN_SECRET must not reuse SUPABASE_SERVICE_ROLE_KEY — rotating that key would make every stored wearable token undecryptable.",
    );
  }

  return scryptSync(secret, "wearable-token-v1", 32);
}

/** Lets the wearables UI warn about missing configuration before a user hits it. */
export function isWearableTokenSecretConfigured(): boolean {
  const secret = process.env.WEARABLE_TOKEN_SECRET;
  return (
    typeof secret === "string" &&
    secret.length >= MIN_SECRET_LENGTH &&
    secret !== process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function encryptTokenPayload(payload: StoredWearableTokens): string {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptTokenPayload(value: string): StoredWearableTokens {
  const [version, ivB64, tagB64, dataB64] = value.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid wearable token payload.");
  }

  const key = encryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8")) as StoredWearableTokens;
}

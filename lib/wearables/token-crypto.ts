import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export type StoredWearableTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
};

function encryptionKey(): Buffer {
  const secret = process.env.WEARABLE_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("WEARABLE_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY is required to store wearable tokens.");
  }
  return scryptSync(secret, "wearable-token-v1", 32);
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

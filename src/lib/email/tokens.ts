import { createHmac, timingSafeEqual } from "node:crypto";

export type AlertTokenPurpose = "confirm" | "unsubscribe";

export type AlertTokenPayload = {
  email: string;
  nonce: string;
  purpose: AlertTokenPurpose;
  expiresAt: number;
};

function tokenSecret(): string {
  const secret = process.env.ALERT_TOKEN_SECRET;
  if (!secret) throw new Error("Missing ALERT_TOKEN_SECRET");
  return secret;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(body: string): string {
  return createHmac("sha256", tokenSecret())
    .update(`boardstarter-alert-v1:${body}`)
    .digest("base64url");
}

export function signAlertToken(
  input: Omit<AlertTokenPayload, "expiresAt"> & { expiresAt?: number },
  now = Date.now(),
): string {
  const payload: AlertTokenPayload = {
    email: input.email.trim().toLowerCase(),
    nonce: input.nonce,
    purpose: input.purpose,
    expiresAt: input.expiresAt ?? now + 48 * 60 * 60 * 1000,
  };
  const body = encode(JSON.stringify(payload));
  return `${body}.${signature(body)}`;
}

export function verifyAlertToken(
  token: string,
  purpose: AlertTokenPurpose,
  now = Date.now(),
): AlertTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, provided] = parts;
    if (!body || !provided || provided.length !== signature(body).length) return null;
    const expected = Buffer.from(signature(body));
    const actual = Buffer.from(provided);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(decode(body)) as Partial<AlertTokenPayload>;
    if (
      typeof payload.email !== "string" ||
      typeof payload.nonce !== "string" ||
      payload.purpose !== purpose ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= now
    ) {
      return null;
    }
    return {
      email: payload.email.trim().toLowerCase(),
      nonce: payload.nonce,
      purpose: payload.purpose,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/**
 * Lemon Squeezy sends a 64-character hexadecimal SHA-256 HMAC. Validate the
 * shape before decoding so malformed input cannot make Buffer throw or create
 * an unequal-length timingSafeEqual call.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signWebhookBody(body, secret), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

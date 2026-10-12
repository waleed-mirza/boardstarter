import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { signWebhookBody, verifyWebhookSignature } from "@/lib/payments/signature";

const BODY = '{"hello":"payment"}';
const SECRET = "week-six-test-secret";

describe("webhook signature verification", () => {
  it("accepts a correctly signed payload", () => {
    expect(verifyWebhookSignature(BODY, signWebhookBody(BODY, SECRET), SECRET)).toBe(true);
  });

  it("rejects a tampered body with the original signature", () => {
    expect(
      verifyWebhookSignature('{"hello":"tampered"}', signWebhookBody(BODY, SECRET), SECRET),
    ).toBe(false);
  });

  it("rejects a signature computed with the wrong secret", () => {
    expect(verifyWebhookSignature(BODY, signWebhookBody(BODY, "wrong-secret"), SECRET)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(BODY, undefined, SECRET)).toBe(false);
  });

  it("rejects malformed hexadecimal input without throwing", () => {
    expect(() => verifyWebhookSignature(BODY, "not-hex", SECRET)).not.toThrow();
    expect(verifyWebhookSignature(BODY, "not-hex", SECRET)).toBe(false);
  });

  it("rejects an unequal-length signature", () => {
    expect(verifyWebhookSignature(BODY, "a".repeat(63), SECRET)).toBe(false);
  });

  it("uses timingSafeEqual for the final comparison", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/payments/signature.ts"), "utf8");
    expect(source).toContain("timingSafeEqual");
  });
});

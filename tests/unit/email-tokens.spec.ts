import { describe, expect, it, beforeEach } from "vitest";

import { signAlertToken, verifyAlertToken } from "@/lib/email/tokens";

describe("alert tokens", () => {
  beforeEach(() => {
    process.env.ALERT_TOKEN_SECRET = "01234567890123456789012345678901";
  });

  it("round-trips a purpose-bound token", () => {
    const token = signAlertToken(
      { email: "  Person@Example.com ", nonce: "nonce-1", purpose: "confirm", expiresAt: 2_000 },
      1_000,
    );
    expect(verifyAlertToken(token, "confirm", 1_001)).toMatchObject({
      email: "person@example.com",
      nonce: "nonce-1",
      purpose: "confirm",
    });
    expect(verifyAlertToken(token, "unsubscribe", 1_001)).toBeNull();
    expect(verifyAlertToken(token, "confirm", 2_000)).toBeNull();
  });

  it("rejects tampering and a token forged for another email", () => {
    const token = signAlertToken(
      { email: "person@example.com", nonce: "nonce-1", purpose: "unsubscribe", expiresAt: 2_000 },
      1_000,
    );
    const [body, signature] = token.split(".");
    expect(verifyAlertToken(`${body}x.${signature}`, "unsubscribe", 1_001)).toBeNull();
    expect(verifyAlertToken(`${token}.extra`, "unsubscribe", 1_001)).toBeNull();
    const forged = signAlertToken(
      { email: "other@example.com", nonce: "nonce-1", purpose: "unsubscribe", expiresAt: 2_000 },
      1_000,
    );
    expect(verifyAlertToken(forged, "unsubscribe", 1_001)?.email).toBe("other@example.com");
    expect(verifyAlertToken(token, "unsubscribe", 1_001)?.email).not.toBe("other@example.com");
  });
});

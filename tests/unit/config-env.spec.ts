import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/config/env";

const VALID_FULL_ENV = {
  NEXT_PUBLIC_SITE_URL: "https://jobs.example.com",
  PAYMENT_PROVIDER: "lemonsqueezy",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc123",
  SUPABASE_SECRET_KEY: "sb_secret_abc123",
  LEMONSQUEEZY_API_KEY: "lsk_live_x",
  LEMONSQUEEZY_STORE_ID: "12345",
  LEMONSQUEEZY_WEBHOOK_SECRET: "whsec_x",
  RESEND_API_KEY: "re_x",
  EMAIL_FROM: "Jobs <jobs@example.com>",
  EMAIL_PROVIDER: "resend",
  ALERT_TOKEN_SECRET: "01234567890123456789012345678901",
  EMAIL_SMTP_HOST: "127.0.0.1",
  EMAIL_SMTP_PORT: "1025",
  MAILPIT_API_URL: "http://127.0.0.1:8025",
  CRON_SECRET: "0123456789abcdef",
  ADMIN_EMAIL: "admin@example.com",
  GROQ_API_KEY: "gsk_x",
  GOOGLE_INDEXING_SA_JSON: "{}",
  NEXT_PUBLIC_PRESET: "ai",
};

describe("envSchema", () => {
  it("accepts a fully valid environment", () => {
    const result = parseEnv(VALID_FULL_ENV);
    expect(result).toMatchObject({ ok: true });
  });

  it("defaults NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_PRESET when the environment is empty", () => {
    const result = parseEnv({});
    expect(result).toEqual({
      ok: true,
      env: {
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        EMAIL_PROVIDER: "resend",
        PAYMENT_PROVIDER: "lemonsqueezy",
        NEXT_PUBLIC_PRESET: "remote",
      },
    });
  });

  it("treats empty strings as absent", () => {
    const result = parseEnv({ NEXT_PUBLIC_SUPABASE_URL: "" });
    expect(result).toEqual({
      ok: true,
      env: {
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        EMAIL_PROVIDER: "resend",
        PAYMENT_PROVIDER: "lemonsqueezy",
        NEXT_PUBLIC_PRESET: "remote",
      },
    });
  });

  it("rejects a publishable key with the legacy anon prefix with a specific error", () => {
    const result = parseEnv({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon.legacy.key",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toContainEqual({
        field: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        message: expect.stringContaining("sb_publishable_"),
      });
    }
  });

  it("rejects a secret key with the legacy service_role prefix with a specific error", () => {
    const result = parseEnv({ SUPABASE_SECRET_KEY: "service_role.legacy" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toContainEqual({
        field: "SUPABASE_SECRET_KEY",
        message: expect.stringContaining("sb_secret_"),
      });
    }
  });

  it("rejects a malformed NEXT_PUBLIC_SUPABASE_URL", () => {
    const result = parseEnv({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown preset name", () => {
    const result = parseEnv({ NEXT_PUBLIC_PRESET: "violet" });
    expect(result.ok).toBe(false);
  });
});

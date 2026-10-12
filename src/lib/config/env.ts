import { z } from "zod";

/**
 * The single env schema (§6). `.env.example` documents every variable;
 * scripts/check-env.ts validates against this at startup and in CI.
 * New-style Supabase keys only — legacy `anon`/`service_role` are rejected.
 */

const absentIfEmpty = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const publishableKey = z
  .string()
  .regex(
    /^sb_publishable_[A-Za-z0-9_-]+$/,
    "must be a publishable key starting with sb_publishable_ (legacy anon keys are deprecated)"
  );

const secretKey = z
  .string()
  .regex(
    /^sb_secret_[A-Za-z0-9_-]+$/,
    "must be a secret key starting with sb_secret_ (legacy service_role keys are deprecated)"
  );

export const envSchema = z.object({
  // Core
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  E2E_EXTERNAL_BASE_URL: absentIfEmpty(z.url()),
  DATABASE_URL: absentIfEmpty(z.string().regex(/^postgres(?:ql)?:\/\//)),
  TEST_DATABASE_URL: absentIfEmpty(z.string().regex(/^postgres(?:ql)?:\/\//)),
  BOARDSTARTER_DB_RESET_CONFIRM: absentIfEmpty(z.string().min(1)),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: absentIfEmpty(z.url()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: absentIfEmpty(publishableKey),
  SUPABASE_SECRET_KEY: absentIfEmpty(secretKey),

  // Lemon Squeezy
  PAYMENT_PROVIDER: z.enum(["lemonsqueezy", "fake"]).default("lemonsqueezy"),
  LEMONSQUEEZY_API_KEY: absentIfEmpty(z.string().min(1)),
  LEMONSQUEEZY_STORE_ID: absentIfEmpty(z.string().min(1)),
  LEMONSQUEEZY_WEBHOOK_SECRET: absentIfEmpty(z.string().min(1)),

  // Email
  EMAIL_PROVIDER: z.enum(["resend", "smtp", "fake"]).default("resend"),
  RESEND_API_KEY: absentIfEmpty(z.string().min(1)),
  EMAIL_FROM: absentIfEmpty(z.string().min(3)),
  ALERT_TOKEN_SECRET: absentIfEmpty(z.string().min(32)),
  EMAIL_SMTP_HOST: absentIfEmpty(z.string().min(1)),
  EMAIL_SMTP_PORT: absentIfEmpty(z.coerce.number().int().min(1).max(65535)),
  MAILPIT_API_URL: absentIfEmpty(z.url()),

  // Ops
  CRON_SECRET: absentIfEmpty(z.string().min(16)),
  RATE_LIMIT_SECRET: absentIfEmpty(z.string().min(32)),
  ADMIN_EMAIL: absentIfEmpty(z.email()),

  // Optional
  GROQ_API_KEY: absentIfEmpty(z.string().min(1)),
  GOOGLE_INDEXING_SA_JSON: absentIfEmpty(z.string().min(1)),
  NEXT_PUBLIC_PRESET: z.enum(["remote", "ai", "local", "community"]).default("remote"),
  // Auth: render the Google button only after you enable the provider
  // in the Supabase dashboard (docs/configuration.md).
  NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: absentIfEmpty(z.enum(["true", "false"])),
});

export type Env = z.infer<typeof envSchema>;

/** Keys that must be present in production (`check-env --strict`). */
export const REQUIRED_IN_PRODUCTION = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "LEMONSQUEEZY_API_KEY",
  "LEMONSQUEEZY_STORE_ID",
  "LEMONSQUEEZY_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "CRON_SECRET",
  "ALERT_TOKEN_SECRET",
] as const;

export type EnvParseResult =
  | { ok: true; env: Env }
  | { ok: false; fieldErrors: Array<{ field: string; message: string }> };

export function parseEnv(raw: Record<string, string | undefined>): EnvParseResult {
  const result = envSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, env: result.data };
  }
  return {
    ok: false,
    fieldErrors: result.error.issues.map((issue) => ({
      // zod v4 path is an array of keys (PrototypeKeys filter keeps it honest)
      field: issue.path.map(String).join(".") || "(root)",
      message: issue.message,
    })),
  };
}

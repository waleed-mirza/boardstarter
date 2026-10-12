# Configuration

Every environment variable, its format, and when it is required. `pnpm check-env` validates all of this.

| Variable                                                        | Required    | Notes                                                                                             |
| --------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                          | yes         | Canonical URL; defaults to `http://localhost:3000` in dev                                         |
| `E2E_EXTERNAL_BASE_URL`                                         | tests       | Optional Playwright target for a deployed preview; otherwise tests use the local build            |
| `DATABASE_URL`                                                  | setup       | Supabase session-pooler connection string used by `pnpm setup`                                    |
| `NEXT_PUBLIC_SUPABASE_URL`                                      | prod        | Supabase project URL                                                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                          | prod        | Must start `sb_publishable_` (legacy `anon` keys rejected)                                        |
| `SUPABASE_SECRET_KEY`                                           | prod        | Must start `sb_secret_`; server-only, never reaches a client bundle                               |
| `TEST_DATABASE_URL`                                             | dev/tests   | Session-pooler connection string for migrations + pgTAP (ADR 0003)                                |
| `BOARDSTARTER_DB_RESET_CONFIRM`                                 | dev/CI only | Exact test-project ref required by the destructive, cloud-only `pnpm db:reset` command            |
| `PAYMENT_PROVIDER`                                              | payments    | `lemonsqueezy` in production; set to `fake` only for deterministic local/E2E runs                 |
| `LEMONSQUEEZY_API_KEY` / `_STORE_ID` / `_WEBHOOK_SECRET`        | payments    | Required when `PAYMENT_PROVIDER=lemonsqueezy`; server-only                                        |
| `EMAIL_PROVIDER`                                                | email       | `resend` in production, `smtp` for Mailpit, `fake` for deterministic tests; cron drains the queue |
| `RESEND_API_KEY`, `EMAIL_FROM`                                  | email       | Required for Resend; sender must be verified                                                      |
| `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `MAILPIT_API_URL`         | email tests | SMTP transport and optional Mailpit inbox URL                                                     |
| `ALERT_TOKEN_SECRET`                                            | email       | At least 32 characters; signs confirmation and unsubscribe links                                  |
| `CRON_SECRET`, `RATE_LIMIT_SECRET`, `ADMIN_EMAIL`               | ops         | Scheduled-route bearer secret, optional distributed limiter HMAC, and bootstrap email             |
| `GROQ_API_KEY`, `GOOGLE_INDEXING_SA_JSON`, `NEXT_PUBLIC_PRESET` | optional    | Optional AI and SEO indexing; presets: `remote` `ai` `local` `community`                          |

Site behavior you change without a redeploy (name, tagline, accent, apply modes, alert frequency, pSEO threshold, footer links) lives in the `site_settings` table. Alert signups queue their confirmation message; the scheduled sender delivers it after signing the one-time link.

## Cron configuration

`CRON_SECRET` must be at least 16 characters and must have the same value in the Netlify production Functions environment and GitHub Actions. Netlify environment contexts and scopes are separate, and changing a Functions variable requires a new deploy before the route can read it. The default demo workflow only keeps a free Supabase project active; it no-ops successfully until its two Actions secrets are present. Opt into expiry, digest, and renewal automation by replacing that workflow with the documented full example in [deployment.md](./deployment.md#scheduled-automation).

`DATABASE_URL` is never read by the web runtime. `RATE_LIMIT_SECRET` is used to hash the request IP before the durable `rate_limits` RPC stores it; no raw IP is persisted.

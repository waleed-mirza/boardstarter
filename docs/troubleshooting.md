# Troubleshooting

## Brand

- The brand check reports a rendered leak: remove the product name from presets, seed data, site defaults, and browser storage keys. A deployed board should show the operator's name, not Boardstarter.

- `check-env` rejects keys — legacy `anon`/`service_role` prefixes are rejected on purpose; create new-style keys in Supabase dashboard → Settings → API.
- `TEST_DATABASE_URL` unset — migrations/pgTAP need it (ADR 0003); see [configuration.md](./configuration.md).
- `pnpm setup` cannot connect — use a Supabase session-pooler URL, verify the password is URL-safe, and set `DATABASE_URL` (or `TEST_DATABASE_URL` for a disposable project). The setup runner normalizes generated passwords.
- Cron returns `401 Unauthorized` — confirm `CRON_SECRET` exists in the Netlify production **Functions** scope, that the GitHub Actions secret has the exact same value, and that Netlify was redeployed after the variable changed. A value in `[template.environment]` or a different Netlify context does not configure the deployed function.
- Keep-alive returns `500 permission denied for function get_public_board_stats` — apply all current Supabase migrations, including the explicit service-role grant in `20260909010000_cron_keep_alive_permissions.sql`, then redeploy only if application environment variables also changed.
- An alert or application returns 429 — the IP window is working. Wait for the window to expire; the Netlify `/api/*` rule is a second, edge-level guard.
- A page shows the friendly error boundary — check the server logs and Supabase status. User-facing boundaries intentionally omit raw database or provider messages.
- Payment checkout fails — confirm the provider variables and use `PAYMENT_PROVIDER=fake` for deterministic local testing. A signed webhook is required before a paid listing publishes.
- Logo upload fails — confirm the `company-logos` storage bucket and its MIME/size policy; the form rejects unsupported files before upload.
- E2E visual diffs after a deliberate design change — regenerate baselines: `pnpm exec playwright test --update-snapshots`, then commit both platform variants.
- pgTAP "no finish() result" — a test file must end with `select * from finish();` and must not BEGIN/COMMIT itself.

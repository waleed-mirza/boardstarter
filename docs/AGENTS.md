# Maintenance guide

## Architecture map

- `src/app` contains route composition, metadata, and route handlers.
- `src/components` contains presentational and interactive UI; it reads data through actions or `src/lib/data`.
- `src/lib/data` is the only home for Supabase queries. `src/lib/actions` owns authenticated mutations and friendly error mapping.
- `src/lib/config/presets.ts` is the single preset contract for copy, categories, accent, email, and OG surfaces.
- `supabase/migrations` is forward-only schema history; `supabase/seed.sql` is deterministic demo content.
- `scripts/setup.ts` is the first-install entry point. It applies migrations, seed, preset defaults, and the initial admin idempotently.

## Recipes

### Add a field to jobs end-to-end

Add the column and constraint in a new migration, update `src/lib/supabase/types.ts` with `pnpm gen:types`, extend the write validation and `src/lib/data/jobs.ts`, then update the public RPC projection, admin form, SEO payload, seed, and tests. Run unit, database, and E2E gates before shipping.

### Add a payment provider

Implement `PaymentProvider` in `src/lib/payments/types.ts`, verify and normalize its webhook in a provider adapter, register it in `src/lib/payments/index.ts`, document its variables, and add signature, retry, amount, currency, and refund tests. The database transition remains provider-neutral.

### Add a preset

Add the id and definition in `src/lib/config/presets.ts`, a token-only file under `src/styles/presets`, the import in `globals.css`, and a preset unit/visual baseline. Do not put the product name in seed data or default settings.

### Change the job row layout

Edit `src/components/jobs/job-row.tsx` and its loading/empty/error siblings together. Use existing semantic tokens and spacing steps, exercise keyboard/focus states, then update the `/jobs` visual baseline and dark-mode screenshot.

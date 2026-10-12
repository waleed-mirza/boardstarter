# Quickstart

The fresh-machine path is clone → install → setup → run. It is designed to fit in 15 minutes.

## Requirements

Node 20.9 or newer, pnpm 10, and a Supabase project. Create a session-pooler database URL in Supabase before running setup.

## Install and configure

```bash
pnpm install
Copy-Item .env.example .env.local # PowerShell; use cp on macOS/Linux
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, and `ADMIN_EMAIL`. `TEST_DATABASE_URL` may be used instead of `DATABASE_URL` for a disposable project. Choose `NEXT_PUBLIC_PRESET=remote|ai|local|community`.

## Create the seeded board

```bash
pnpm run setup
pnpm run setup # safe to run again; migrations, seed, preset, and admin are idempotent
```

Setup applies migrations, loads the demo catalog, applies the selected preset, creates or promotes the administrator, and prints the next steps. The service key is used only by this script.

## Run and verify

```bash
pnpm dev
```

Open http://localhost:3000, then visit `/admin` after signing in with the configured email. Before opening a pull request, run:

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
pnpm verify:security
```

Database and browser suites require the corresponding Supabase and Playwright environment described in [configuration.md](./configuration.md).

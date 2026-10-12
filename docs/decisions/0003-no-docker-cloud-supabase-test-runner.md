# ADR 0003 — No Docker: cloud Supabase + Node pgTAP runner

- **Status:** Accepted (user decision, 2026-09-06)
- **Context:** §0.1.7 and §1 assume local Supabase via the CLI (`supabase start`), which requires Docker. The user requires development with **no Docker anywhere**, without compromising functionality.
- **Decision:**
  - Dev/test database is a **free-tier cloud Supabase project** (Postgres 15+, RLS, auth — identical semantics to the local stack).
  - pgTAP tests run through a **custom Node runner** (`scripts/test-db.ts`, `postgres` via `pg`): each `supabase/tests/*.test.sql` file executes inside its own transaction and **rolls back**, so tests are isolated and the shared project stays clean. Works identically on Windows and CI. Replaces `supabase test db`.
  - Migrations apply via `scripts/db-push.ts` (executes `supabase/migrations/*.sql` in name order against the project, tracked in the unexposed `boardstarter_internal.schema_migrations` table). Replaces `supabase db push`'s local-Docker path.
  - `pnpm gen:types` introspects the live public schema directly through the same `pg` connection. The installed Supabase CLI's remote type command currently falls back to a Docker container, so it is not used in this no-Docker workflow.
  - CI runs the same scripts with `TEST_DATABASE_URL` from GitHub secrets — no service containers.
  - Week 3 auth browser tests use the cloud project's Admin `generateLink()` API to obtain a deterministic magic-link token. The browser visits the local `/callback` route with that token hash; the server calls `verifyOtp` through `@supabase/ssr`, writes the real session cookie, and exercises the protected-route flow. The sign-in form test executes the real client form while Playwright stubs only the cloud `/auth/v1/otp` email-send request, because cloud SMTP cannot deliver to a local Mailpit instance without a public tunnel. This replaces the literal local-Mailpit inbox step; SMTP delivery is an explicit Week 10 deployment concern, not silently treated as covered by the local auth suite.
- **Consequences:**
  - `TEST_DATABASE_URL` (session pooler connection string) is the single database handle for tests; it lives in `.env.local` / GH secrets, never in the repo.
  - pgTAP is installed by migration `00000000000000_pgtap.sql` (available as a cloud extension). RLS tests use transaction-local `set role` plus `request.jwt.claims` to exercise `anon`, `authenticated`, and `service_role`; no `supabase_test_helpers` dependency is required.
  - Tests share one database with manual dev; transaction rollback provides isolation, but any test that cannot run in a transaction must be flagged and handled when it first appears.
  - The destructive reset refuses to run without the exact project-ref confirmation and refuses non-test auth users.
  - Week-to-week plan references to "local Supabase" / `supabase start` read as "the cloud dev project".

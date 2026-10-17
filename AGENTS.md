<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Boardstarter project rules

Source of truth: [`docs/BOARDSTARTER-10-WEEK-BUILD-PLAN.md`](./docs/BOARDSTARTER-10-WEEK-BUILD-PLAN.md). Read §0 (operating rules + forbidden patterns — CI greps for them) and the current week's section before writing code.

Non-negotiables (violations are the plan's Appendix D failure modes):

- `proxy.ts`, never `middleware.ts`. `await` all `params`/`searchParams`/`cookies()`/`headers()`. `revalidateTag(tag, 'max')` two-arg form, or `updateTag` in a Server Action.
- `@supabase/ssr` only (never `auth-helpers`); `getUser()` on the server; cookies via `getAll`/`setAll` only.
- Supabase queries live only in `src/lib/data/*`. The `src/lib/supabase/admin.ts` client is `server-only` and allowed only in `api/webhooks/*`, `api/cron/*`, `lib/actions/admin/*`, `scripts/*`, with a one-line comment why RLS couldn't do the job.
- Tests are the definition of done (§4). Test-first on money, auth, and published state. Never disable a test to go green.
- Plan-then-build: each week starts with a file-by-file plan awaiting user approval (§0.1.2).
- Product casing is always `Boardstarter`; the name never appears in seed data, presets, or default site settings.
- Design tokens only — no colors, radii, spacing, or type sizes outside the `@theme` set (§5.2–5.3).

Dev-time agent memory stays on the maintainer's machine and is not part of this repo. Week 9 replaces this pointer with contributor-facing docs.

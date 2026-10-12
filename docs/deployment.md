# Deployment

Netlify uses the Next.js adapter selected from `netlify.toml`. A Git-connected site deploys every pushed commit; the CLI can also publish the current worktree for a preview or production hotfix.

1. Link the repository in Netlify and set every variable in the `[template.environment]` list. Those entries provide deployment prompts; they do not populate an already-linked site's runtime values. Keep server-only keys out of `NEXT_PUBLIC_*`.
2. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS domain and set `NEXT_PUBLIC_PRESET` before the first `pnpm setup`.
3. Run `pnpm run setup` against the production Supabase project (or apply migrations with `pnpm db:push` and then seed intentionally). Confirm `/`, `/jobs`, `/admin`, and a job detail page.
4. For a direct CLI deploy: `netlify deploy --build --prod`. For the normal workflow, push to the connected Git branch and let Netlify build the same `pnpm build` command.
5. For the included demo, add `NEXT_PUBLIC_SITE_URL` and `CRON_SECRET` as GitHub Actions secrets. Set the same `CRON_SECRET` in the Netlify **production Functions** scope, then trigger a production deploy so the function receives the new value. The default workflow makes one daily, bearer-protected keep-alive request; it safely skips the request until both secrets exist.

The site sends security headers for every response and applies a Netlify IP rate-limit rule to `/api/*`. Application-level limits remain in Supabase so they work across serverless instances.

## Your board

Deploy this repository as your board. Its public name, tagline, and accent come from the selected preset and site settings. Configure the payment provider so employers can pay for listings.

## Scheduled automation

The checked-in [workflow](../.github/workflows/cron.yml) is intentionally in **demo mode**: it runs only `keep-alive` once per day, so a free Supabase project stays active without sending alerts, changing demo listings, or sending renewal messages.

To enable the complete automation suite on your live board:

1. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS URL and `CRON_SECRET` to a long random value in Netlify. Do not expose the secret with a `NEXT_PUBLIC_` name.
2. In your GitHub repository, add Actions secrets with the exact names `NEXT_PUBLIC_SITE_URL` and `CRON_SECRET`. The `CRON_SECRET` value must match Netlify's production Functions value exactly. Redeploy after changing it.
3. Copy [the full automation workflow example](./examples/github-actions-full-cron.yml) to `.github/workflows/cron.yml`, replacing the demo workflow, and commit it to the default branch.
4. In GitHub Actions, run **Boardstarter automation** manually once. Confirm each matrix task succeeds before relying on the schedule.

The full workflow invokes `expire-jobs`, `send-digest`, `renewal-nudges`, and `keep-alive` every 15 minutes. Enable it only after you have configured the production email provider and, where applicable, the payment provider. If you do not use alerts or paid renewals, keep the demo workflow or remove unneeded tasks from the example's matrix.

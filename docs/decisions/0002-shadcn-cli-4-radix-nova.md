# ADR 0002 — shadcn CLI 4.x (radix-nova) instead of classic 2.x-style output

- **Status:** Accepted (2026-09-06)
- **Context:** §1 locks "shadcn/ui (copied in, not a dependency) — owned code, operators can edit it". The current shadcn CLI (4.21) no longer emits the classic output my plan assumed: components import a unified `radix-ui` package and a `cn` helper package, and init injects `@import "shadcn/tailwind.css"` plus a `next/font/google` Geist import into the project.
- **Decision:** Use CLI 4.21 with `--base radix --preset nova` (Lucide + Geist — matches §1), then reconcile to the plan's rules:
  - Component source still lands in `src/components/ui/*` as owned, editable code — the substance of the locked decision holds.
  - `cn` dependency replaced by a local `cn()` in `src/lib/utils.ts` (clsx + tailwind-merge).
  - `shadcn` runtime dependency dropped; `shadcn/tailwind.css` vendored to `src/styles/shadcn-base.css` (structural only: keyframes + data-state variants).
  - Google Fonts import removed; Geist stays self-hosted via `next/font/local` (§1).
  - CLI-written token soup in `globals.css` replaced by the §5.3 contract; shadcn semantic vars aliased onto our tokens in `@theme inline`.
  - `radix-ui` and `tw-animate-css` stay as dependencies (primitive runtime + animation utilities — equivalent to the per-package `@radix-ui/react-*` deps the classic output added).
- **Consequences:** `components.json` must keep `"style": "radix-nova"` for future `add` runs; every `add` needs the same post-sweep (localize `cn` imports, check focus styles) — scripted where possible. Buyers get the same own-the-code guarantee.

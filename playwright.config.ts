import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.E2E_EXTERNAL_BASE_URL;
const baseURL =
  externalBaseUrl ??
  process.env.BASE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

/**
 * L4 E2E (§4): user journeys against a production build.
 * L5 smoke: `pnpm test:smoke -- --base-url=https://<deployed-url>` (tagged @smoke).
 * Visual baselines are per-platform (Playwright suffixes -win32/-linux) —
 * regenerate with `pnpm exec playwright test --update-snapshots` after a
 * deliberate design change.
 */

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  // Cloud Supabase invalidates a previous refresh token when the same seeded
  // account requests another magic link. Keep CI's shared auth fixtures
  // deterministic; local runs can opt into the same mode with --workers=1.
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    },
  },

  // Production build, per §4 L4. reuseExistingServer lets a dev server stand in
  // during iteration.
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },

  projects: [
    {
      name: "auth-setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
    {
      name: "chromium",
      dependencies: ["auth-setup"],
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
    {
      name: "mobile",
      dependencies: ["auth-setup"],
      // Stateful auth journeys run once on Chromium; the mobile project
      // verifies the responsive auth surfaces without sharing revocable
      // Supabase sessions across projects.
      testMatch: /.*(accessibility|jobs|visual|kitchen-sink|public-board)\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
});

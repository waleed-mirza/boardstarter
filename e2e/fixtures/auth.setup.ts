import { test as setup } from "@playwright/test";

import { AUTH_STATE_PATHS, AUTH_USERS, signInAndSaveState } from "./auth";

setup("create anonymous storage state", async ({ page }) => {
  await page.goto("/");
  await page.context().storageState({ path: AUTH_STATE_PATHS.anonymous });
});

setup("authenticate employer A", async ({ page }) => {
  await signInAndSaveState(
    page,
    AUTH_USERS.employerA,
    AUTH_STATE_PATHS.employerA,
    "/dashboard",
    "Your jobs",
  );
});

setup("authenticate employer B", async ({ page }) => {
  await signInAndSaveState(
    page,
    AUTH_USERS.employerB,
    AUTH_STATE_PATHS.employerB,
    "/dashboard",
    "Your jobs",
  );
});

setup("authenticate admin", async ({ page }) => {
  await signInAndSaveState(
    page,
    AUTH_USERS.admin,
    AUTH_STATE_PATHS.admin,
    "/admin",
    "Review queue",
  );
});

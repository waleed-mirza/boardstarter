import { expect, test } from "@playwright/test";

import { AUTH_STATE_PATHS, AUTH_USERS, completeMagicLink } from "../fixtures/auth";

test.use({ storageState: AUTH_STATE_PATHS.anonymous });

test.describe("employer visual contract", () => {
  test("dashboard populated state", async ({ page }) => {
    await completeMagicLink(page, AUTH_USERS.employerA.email, "/dashboard");
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
    await expect(page).toHaveScreenshot("employer-dashboard.png", { fullPage: true });
  });

  test("post form empty state", async ({ page }) => {
    await completeMagicLink(page, AUTH_USERS.employerA.email, "/dashboard");
    await page.goto("/dashboard/post");
    await expect(page.getByRole("heading", { name: "Post a job" })).toBeVisible();
    await expect(page).toHaveScreenshot("employer-post-form.png", { fullPage: true });
  });
});

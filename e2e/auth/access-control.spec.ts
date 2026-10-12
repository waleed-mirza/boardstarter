import { expect, test } from "@playwright/test";

import { AUTH_STATE_PATHS, AUTH_USERS, completeMagicLink } from "../fixtures/auth";

test.describe("anonymous access", () => {
  test("redirects an anonymous dashboard request with its next parameter", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
  });

  test("returns an anonymous user to the intended page after sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);

    await completeMagicLink(page, AUTH_USERS.employerA.email, "/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
  });

  test("redirects an anonymous admin request with its next parameter", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin$/);
  });

  test("returns an admin to the intended page after sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin$/);

    await completeMagicLink(page, AUTH_USERS.admin.email, "/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
  });
});

test.describe("employer access", () => {
  test.use({ storageState: AUTH_STATE_PATHS.employerA });

  test("shows a 403 to an employer without rendering admin content", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Review queue" })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin access required" })).toBeVisible();
  });

  test("sign-out clears the session and protects dashboard again", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
  });
});

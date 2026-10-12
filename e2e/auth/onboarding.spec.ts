import { expect, test } from "@playwright/test";

import { completeMagicLink, createUnonboardedUser } from "../fixtures/auth";

test.describe("employer onboarding", () => {
  test("routes a new employer without a company to onboarding and protects post-job access", async ({
    page,
  }) => {
    const fixture = await createUnonboardedUser();
    try {
      await completeMagicLink(page, fixture.email, "/dashboard");
      await expect(page).toHaveURL(/\/onboarding$/);
      await expect(page.getByRole("heading", { name: "Create your company" })).toBeVisible();

      await page.goto("/dashboard/post");
      await expect(page).toHaveURL(/\/onboarding$/);
    } finally {
      await fixture.cleanup();
    }
  });

  test("creates a company and unlocks the employer dashboard", async ({ page }) => {
    const fixture = await createUnonboardedUser();
    try {
      await completeMagicLink(page, fixture.email, "/dashboard");
      await page.getByLabel("Company name").fill(`E2E Company ${fixture.suffix}`);
      await page.getByRole("button", { name: "Create company" }).click();

      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });
});

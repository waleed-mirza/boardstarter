import { expect, test } from "@playwright/test";

import { AUTH_USERS, completeMagicLink, requestMagicLinkFromUi } from "../fixtures/auth";

test.describe("magic-link authentication", () => {
  test("signs in through the email form and generated magic link", async ({ page }) => {
    await requestMagicLinkFromUi(page, AUTH_USERS.employerA.email, "/dashboard");
    await expect(page).toHaveURL(/\/verify\?email=/);

    await completeMagicLink(page, AUTH_USERS.employerA.email, "/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
  });

  test("preserves the session after a full reload and in a new tab", async ({ page }) => {
    await completeMagicLink(page, AUTH_USERS.employerA.email, "/dashboard");
    await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();

    const newPage = await page.context().newPage();
    try {
      await newPage.goto("/dashboard");
      await expect(newPage.getByRole("heading", { name: "Your jobs" })).toBeVisible();
    } finally {
      await newPage.close();
    }
  });
});

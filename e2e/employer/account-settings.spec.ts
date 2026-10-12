import { expect, test } from "@playwright/test";

import { completeMagicLink, createUnonboardedUser } from "../fixtures/auth";

test("updates profile and editable company settings for a linked employer", async ({ page }) => {
  const fixture = await createUnonboardedUser();
  try {
    await completeMagicLink(page, fixture.email, "/dashboard");
    await page.getByLabel("Company name").fill(`Settings Company ${fixture.suffix}`);
    await page.getByRole("button", { name: "Create company" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/settings");
    await page.getByLabel("Name", { exact: true }).fill("Updated Employer");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByText("Saved.", { exact: true }).first()).toBeVisible();

    await page.getByLabel("Company name", { exact: true }).fill("Updated Settings Company");
    await page.getByLabel("Location", { exact: true }).fill("Remote");
    await page.getByRole("button", { name: "Save company" }).click();
    await expect(page.getByText("Saved.", { exact: true }).last()).toBeVisible();
    await expect(page.locator('[name="unlimited_until"]')).toHaveCount(0);
  } finally {
    await fixture.cleanup();
  }
});

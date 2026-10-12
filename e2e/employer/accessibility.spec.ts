import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  AUTH_STATE_PATHS,
  AUTH_USERS,
  completeMagicLink,
  createUnonboardedUser,
} from "../fixtures/auth";

test.describe("employer accessibility", () => {
  test("post form has no serious or critical axe violations", async ({ page }) => {
    const fixture = await createUnonboardedUser();
    try {
      await completeMagicLink(page, fixture.email, "/dashboard");
      await page.getByLabel("Company name").fill(`Accessibility Company ${fixture.suffix}`);
      await page.getByRole("button", { name: "Create company" }).click();
      await page.goto("/dashboard/post");
      await expect(page.getByRole("heading", { name: "Post a job" })).toBeVisible();
      await expectAxeClean(page);
    } finally {
      await fixture.cleanup();
    }
  });

  test("billing package selection has no serious or critical axe violations", async ({ page }) => {
    await completeMagicLink(page, AUTH_USERS.employerA.email, "/dashboard");
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expectAxeClean(page);
  });

  test.describe("authenticated dashboard", () => {
    test.use({ storageState: AUTH_STATE_PATHS.anonymous });

    test("dashboard has no serious or critical axe violations", async ({ page }) => {
      await completeMagicLink(page, AUTH_USERS.employerA.email, "/dashboard");
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
      await expectAxeClean(page);
    });
  });
});

async function expectAxeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(
    serious.map((violation) => `${violation.id}: ${violation.help}`),
    `axe violations: ${JSON.stringify(serious, null, 2)}`,
  ).toEqual([]);
}

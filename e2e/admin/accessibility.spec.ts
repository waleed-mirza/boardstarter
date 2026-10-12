import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { AUTH_STATE_PATHS } from "../fixtures/auth";

test.use({ storageState: AUTH_STATE_PATHS.admin });

test.describe("admin accessibility", () => {
  test("review queue has no serious or critical axe violations", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
    await expectAxeClean(page);
  });

  test("settings form has no serious or critical axe violations", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expectAxeClean(page);
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

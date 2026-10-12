import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { completeMagicLink, createUnonboardedUser } from "../fixtures/auth";

test.describe("auth accessibility", () => {
  test("sign-in has no serious or critical axe violations", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeAttached();
    await expectAxeClean(page);
  });

  test("onboarding has no serious or critical axe violations", async ({ page }) => {
    const fixture = await createUnonboardedUser();
    try {
      await completeMagicLink(page, fixture.email, "/dashboard");
      await expect(page.getByRole("heading", { name: "Create your company" })).toBeAttached();
      await expectAxeClean(page);
    } finally {
      await fixture.cleanup();
    }
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

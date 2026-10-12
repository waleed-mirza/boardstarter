import AxeBuilder from "@axe-core/playwright";
import { expect, test, type TestInfo } from "@playwright/test";

const desktopOnly = (testInfo: TestInfo) => testInfo.project.name !== "chromium";

test.describe("kitchen sink", () => {
  test("renders every pattern section", async ({ page }) => {
    await page.goto("/kitchen-sink");

    await expect(page.getByRole("heading", { name: "Kitchen sink" })).toBeVisible();
    for (const section of ["Patterns", "DataTable", "Form fields", "Primitives"]) {
      await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
    }
    for (const status of ["Draft", "Pending review", "Live", "Expired", "Rejected"]) {
      await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
    }
  });

  test("axe reports zero serious/critical violations in light theme", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "axe runs on desktop chromium");

    await page.goto("/kitchen-sink");
    await checkAxe(page);
  });

  test("axe reports zero serious/critical violations in dark theme", async ({ page }, testInfo) => {
    test.skip(desktopOnly(testInfo), "axe runs on desktop chromium");

    await page.goto("/kitchen-sink");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await checkAxe(page);
  });
});

async function checkAxe(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? "")
  );
  expect(
    serious.map((violation) => `${violation.id}: ${violation.help}`),
    `axe violations: ${JSON.stringify(serious, null, 2)}`
  ).toEqual([]);
}

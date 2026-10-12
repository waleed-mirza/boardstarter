import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("public job board", () => {
  test("each seeded facet returns its expected live count", async ({ page }) => {
    const cases = [
      ["category=software-engineering", "12 jobs"],
      ["type=full_time", "24 jobs"],
      ["remote=1", "20 jobs"],
      ["salary=under-75k", "4 jobs"],
      ["tag=typescript", "2 jobs"],
      ["location=Toronto", "2 jobs"],
    ] as const;

    for (const [query, expected] of cases) {
      await page.goto(`/jobs?${query}`);
      await expect(page.getByTestId("job-total")).toHaveText(expected);
    }
  });

  test("combines facets as an intersection and survives a fresh session", async ({ page, context }) => {
    const url = "/jobs?category=software-engineering&remote=1";
    await page.goto(url);
    await expect(page.getByTestId("job-total")).toHaveText("9 jobs");
    await expect(page.getByTestId("job-row")).toHaveCount(9);

    const freshPage = await context.newPage();
    await freshPage.goto(url);
    await expect(freshPage.getByTestId("job-total")).toHaveText("9 jobs");
    await freshPage.close();
  });

  test("keeps workflow and expired jobs out of every public list", async ({ page }) => {
    await page.goto("/jobs?q=automation");
    await expect(page.getByTestId("job-total")).toHaveText("0 jobs");
    await expect(page.getByText("qa-automation-engineer")).toHaveCount(0);

    await page.goto("/jobs?q=ruby");
    await expect(page.getByTestId("job-total")).toHaveText("0 jobs");
    await expect(page.getByText("Senior Ruby Engineer")).toHaveCount(0);
  });

  test("serves an expired direct URL with a banner", async ({ page }) => {
    const response = await page.goto("/jobs/senior-ruby-engineer-expired");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("status")).toContainText("listing has expired");
  });

  test("renders an actionable empty state", async ({ page }) => {
    await page.goto("/jobs?q=zzzz-no-such-role");
    await expect(page.getByText("No jobs match these filters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/jobs");
  });

  test("mobile filter sheet opens, applies, and exposes the active count", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile filter contract");
    await page.goto("/jobs");
    const trigger = page.getByRole("button", { name: /^Filters/ });
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("radio", { name: /^Remote/ }).check();
    await page.getByRole("dialog").getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/remote=1/);
    await expect(page.getByRole("button", { name: /Filters, 1 active/ })).toBeVisible();
  });

  test("home, list, and detail have no serious or critical axe violations", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "axe runs on desktop chromium");
    for (const path of ["/", "/jobs", "/jobs/senior-typescript-engineer"]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
      expect(serious, `${path}: ${JSON.stringify(serious)}`).toEqual([]);
    }
  });
});

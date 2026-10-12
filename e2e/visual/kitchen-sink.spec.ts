import { expect, test } from "@playwright/test";

/**
 * Visual-regression baselines (§4): /kitchen-sink, light and dark,
 * desktop and mobile. Baselines are per-platform — regenerate with
 * `--update-snapshots` after a deliberate design change only.
 */

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.title.match(/dark/) ? "dark" : "light";
  await page.addInitScript(
    (value) => {
      localStorage.setItem("theme", value);
      if (value === "dark") document.documentElement.classList.add("dark");
    },
    theme
  );
});

test("kitchen-sink full page — light, desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop baseline");
  await page.goto("/kitchen-sink");
  await expect(page.getByRole("heading", { name: "Kitchen sink" })).toBeVisible();
  await expect(page).toHaveScreenshot("kitchen-sink-light-desktop.png", { fullPage: true });
});

test("kitchen-sink full page — dark, desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop baseline");
  await page.goto("/kitchen-sink");
  await expect(page.getByRole("heading", { name: "Kitchen sink" })).toBeVisible();
  await expect(page).toHaveScreenshot("kitchen-sink-dark-desktop.png", { fullPage: true });
});

test("kitchen-sink full page — light, mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile baseline");
  await page.goto("/kitchen-sink");
  await expect(page.getByRole("heading", { name: "Kitchen sink" })).toBeVisible();
  await expect(page).toHaveScreenshot("kitchen-sink-light-mobile.png", { fullPage: true });
});

test("kitchen-sink full page — dark, mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile baseline");
  await page.goto("/kitchen-sink");
  await expect(page.getByRole("heading", { name: "Kitchen sink" })).toBeVisible();
  await expect(page).toHaveScreenshot("kitchen-sink-dark-mobile.png", { fullPage: true });
});

for (const theme of ["light", "dark"] as const) {
  test(`JobRow states — ${theme}, desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "desktop row-state baseline");
    await page.goto("/kitchen-sink");
    for (const state of ["default", "featured", "remote", "no-salary", "long-title", "missing-logo"] as const) {
      const row = page.getByTestId(`job-row-demo-${state}`).getByTestId("job-row");
      await expect(row).toHaveScreenshot(`job-row-${theme}-${state}.png`);
    }
    const hovered = page.getByTestId("job-row-demo-default").getByTestId("job-row");
    await hovered.hover();
    await expect(hovered).toHaveScreenshot(`job-row-${theme}-hover.png`);
  });
}

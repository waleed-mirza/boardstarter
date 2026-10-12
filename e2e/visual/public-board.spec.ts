import { expect, test } from "@playwright/test";

const routes = [
  ["home", "/"],
  ["list", "/jobs"],
  ["detail", "/jobs/senior-typescript-engineer"],
] as const;

async function waitForPublicSurface(page: import("@playwright/test").Page, name: string) {
  if (name === "home") await expect(page.getByRole("heading", { name: "Find your next role." })).toBeVisible();
  if (name === "list") await expect(page.getByTestId("job-total")).toBeVisible();
  if (name === "detail") await expect(page.getByRole("heading", { name: "Senior TypeScript Engineer" })).toBeVisible();
}

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.title.includes("dark") ? "dark" : "light";
  await page.addInitScript((value) => {
    localStorage.setItem("theme", value);
    if (value === "dark") document.documentElement.classList.add("dark");
  }, theme);
});

for (const [name, path] of routes) {
  test(`public ${name} — light, desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "desktop baseline");
    await page.goto(path);
    await waitForPublicSurface(page, name);
    await expect(page).toHaveScreenshot(`public-${name}-light-desktop.png`, { fullPage: true });
  });

  test(`public ${name} — dark, desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "desktop baseline");
    await page.goto(path);
    await waitForPublicSurface(page, name);
    await expect(page).toHaveScreenshot(`public-${name}-dark-desktop.png`, { fullPage: true });
  });

  test(`public ${name} — light, mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile baseline");
    await page.goto(path);
    await waitForPublicSurface(page, name);
    await expect(page).toHaveScreenshot(`public-${name}-light-mobile.png`, { fullPage: true });
  });

  test(`public ${name} — dark, mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile baseline");
    await page.goto(path);
    await waitForPublicSurface(page, name);
    await expect(page).toHaveScreenshot(`public-${name}-dark-mobile.png`, { fullPage: true });
  });
}

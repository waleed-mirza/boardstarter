import { expect, test } from "@playwright/test";

test.describe("home (public shell)", () => {
  test("@smoke returns 200 and renders the header and footer", async ({ page, request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);

    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Post a Job" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("@smoke theme toggle switches and persists across reloads", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();

    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("@smoke no flash of the wrong theme on first paint", async ({ page }) => {
    // Dark stored → the pre-paint script must apply .dark before the page
    // paints: at the load event the class is set and the background is dark.
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto("/");

    const isDarkAtLoad = await page.evaluate(
      () => document.documentElement.classList.contains("dark")
    );
    expect(isDarkAtLoad).toBe(true);

    // Notation-agnostic light check: the body background must differ from a
    // white probe (computed colors serialize as lab()/rgb() depending on engine).
    const { bodyBg, whiteBg } = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "white";
      document.body.appendChild(probe);
      const white = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { bodyBg: getComputedStyle(document.body).backgroundColor, whiteBg: white };
    });
    expect(bodyBg).not.toBe(whiteBg);
  });
});

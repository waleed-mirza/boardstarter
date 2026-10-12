import { expect, test } from "@playwright/test";

import { completeMagicLink, createUnonboardedUser } from "../fixtures/auth";

const DESCRIPTION =
  "This role partners with a thoughtful product and platform team to build dependable systems for our customers. ".repeat(
    2,
  );

async function createCompany(
  page: import("@playwright/test").Page,
  fixture: { email: string; suffix: string },
) {
  await completeMagicLink(page, fixture.email, "/dashboard");
  await page.getByLabel("Company name").fill(`E2E Posting Company ${fixture.suffix}`);
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function chooseCategory(page: import("@playwright/test").Page) {
  await page.locator("#job-category").click();
  await page.getByRole("option").first().click();
}

test.describe("employer posting", () => {
  test("posts, edits, and closes an owner-only draft", async ({ page }) => {
    const fixture = await createUnonboardedUser();
    const title = `E2E Posting ${fixture.suffix}`;
    const editedTitle = `E2E Edited ${fixture.suffix}`;
    try {
      await createCompany(page, fixture);
      await page.goto("/dashboard/post");
      await page.getByLabel("Job title").fill(title);
      await page.locator("#job-description").fill(DESCRIPTION);
      await chooseCategory(page);
      await page
        .getByRole("textbox", { name: "Application URL" })
        .fill("https://example.test/jobs/apply");
      await page.getByRole("button", { name: "Save draft" }).click();

      await expect(page).toHaveURL(/\/dashboard$/);
      const table = page.getByRole("table");
      await expect(table.getByText(title, { exact: true })).toBeVisible();
      await page.goto("/jobs");
      await expect(page.getByText(title, { exact: true })).not.toBeVisible();
      await page.goto("/dashboard");
      const actions = table.getByRole("button", { name: `Actions for ${title}` });
      await actions.click();
      await page.getByRole("menuitem", { name: "Edit" }).click();
      await expect(page).toHaveURL(/\/dashboard\/jobs\/[^/]+\/edit$/);

      await page.locator("#job-title:visible").fill(editedTitle);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole("table").getByText(editedTitle, { exact: true })).toBeVisible();

      await page
        .getByRole("table")
        .getByRole("button", { name: `Actions for ${editedTitle}` })
        .click();
      await page.getByRole("menuitem", { name: "Close job" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(editedTitle);
      await dialog.getByRole("button", { name: "Close job", exact: true }).click();

      await page.getByRole("tab", { name: /Closed/ }).click();
      await expect(page.getByRole("table").getByText(editedTitle, { exact: true })).toBeVisible();
      await page.getByRole("tab", { name: /Active/ }).click();
      await expect(
        page.getByRole("table").getByText(editedTitle, { exact: true }),
      ).not.toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });

  test("shows field-level validation and restores an autosaved draft", async ({ page }) => {
    const fixture = await createUnonboardedUser();
    try {
      await createCompany(page, fixture);
      await page.goto("/dashboard/post");
      await page.getByLabel("Job title").fill("No");
      await page.locator("#job-description").fill("Too short");
      await page.getByRole("button", { name: "Save draft" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "at least 4" })).toBeVisible();
      await expect(page.getByRole("alert").filter({ hasText: "at least 100" })).toBeVisible();

      let warned = false;
      page.once("dialog", async (dialog) => {
        warned = true;
        await dialog.dismiss();
      });
      await page.getByRole("link", { name: "Cancel" }).click();
      expect(warned).toBe(true);
      await expect(page).toHaveURL(/\/dashboard\/post$/);

      await page.getByLabel("Job title").fill("Autosaved employer draft");
      await page.waitForTimeout(100);
      await page.reload();
      await expect(page.getByRole("status")).toContainText("saved draft was restored");
      await expect(page.getByLabel("Job title")).toHaveValue("Autosaved employer draft");
    } finally {
      await fixture.cleanup();
    }
  });

  test("accepts a real logo and rejects oversized or spoofed files", async ({ page }) => {
    const fixture = await createUnonboardedUser();
    try {
      await createCompany(page, fixture);
      await page.goto("/dashboard/settings");
      const input = page.locator('input[type="file"]');
      await input.setInputFiles({
        name: "company.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
      await input.dispatchEvent("change");
      await expect(page.getByRole("button", { name: "Upload logo" })).toBeEnabled();
      await page.getByRole("button", { name: "Upload logo" }).click();
      await expect(page.getByRole("status")).toContainText("Saved.");

      await input.setInputFiles({
        name: "too-large.png",
        mimeType: "image/png",
        buffer: Buffer.alloc(5 * 1024 * 1024),
      });
      await expect(page.getByRole("button", { name: "Upload logo" })).toBeEnabled();
      await page.getByRole("button", { name: "Upload logo" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "2 MB or smaller" })).toBeVisible();

      await input.setInputFiles({
        name: "not-an-image.png",
        mimeType: "image/png",
        buffer: Buffer.from("MZ"),
      });
      await expect(page.getByRole("button", { name: "Upload logo" })).toBeEnabled();
      await page.getByRole("button", { name: "Upload logo" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "valid PNG" })).toBeVisible();
    } finally {
      await fixture.cleanup();
    }
  });
});

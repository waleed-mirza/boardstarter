import { createHmac } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { completeMagicLink, createUnonboardedUser } from "../fixtures/auth";

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "ci-week-six-webhook-secret";
const DESCRIPTION =
  "This payment journey verifies that a complete listing can move from draft to a live public job. ".repeat(
    2,
  );
const CHECKOUT_SUCCESS_URL = /\/dashboard\/billing\/success\?/;

function signedPayload(payload: Record<string, unknown>): { body: string; signature: string } {
  const body = JSON.stringify(payload);
  return { body, signature: createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex") };
}

function packageAmount(variantId: string): number {
  if (variantId === "featured-listing-30") return 7900;
  if (variantId === "featured-listing-60") return 12900;
  return 4900;
}

async function createCompany(
  page: Page,
  fixture: { email: string; suffix: string },
): Promise<void> {
  await completeMagicLink(page, fixture.email, "/dashboard");
  await page.getByLabel("Company name").fill(`Payment Company ${fixture.suffix}`);
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function fillJob(page: Page, title: string): Promise<void> {
  await page.goto("/dashboard/post");
  await page.getByLabel("Job title").fill(title);
  await page.locator("#job-description").fill(DESCRIPTION);
  await page.locator("#job-category").click();
  await page.getByRole("option").first().click();
  await page.getByRole("textbox", { name: "Application URL" }).fill("https://example.test/apply");
}

async function postWebhook(page: Page, payload: Record<string, unknown>): Promise<void> {
  const { body, signature } = signedPayload(payload);
  const response = await page.request.post("/api/webhooks/lemonsqueezy", {
    headers: { "content-type": "application/json", "X-Signature": signature },
    data: body,
  });
  expect(response.status()).toBe(200);
}

async function expectPublicJob(page: Page, title: string): Promise<void> {
  await expect
    .poll(
      async () => {
        await page.goto("/jobs");
        return await page.getByText(title, { exact: true }).count();
      },
      { timeout: 15_000, intervals: [500, 1_000, 2_000] },
    )
    .toBeGreaterThan(0);
}

async function expectCheckoutSuccess(page: Page): Promise<void> {
  // A cloud-backed post + checkout can take longer than Playwright's default
  // five-second assertion window even though the browser redirect succeeds.
  await expect(page).toHaveURL(CHECKOUT_SUCCESS_URL, { timeout: 15_000 });
}

function checkoutValues(page: Page): {
  jobId: string;
  packageId: string;
  variantId: string;
  orderId: string;
} {
  const url = new URL(page.url());
  const jobId = url.searchParams.get("fake_job_id");
  const packageId = url.searchParams.get("fake_package_id");
  const variantId = url.searchParams.get("fake_variant_id");
  const orderId = url.searchParams.get("fake_order_id");
  if (!jobId || !packageId || !variantId || !orderId) {
    throw new Error(`Fake checkout URL did not contain payment identifiers: ${url}`);
  }
  return { jobId, packageId, variantId, orderId };
}

function paidPayload(values: ReturnType<typeof checkoutValues>) {
  return {
    meta: {
      event_name: "order_created",
      custom_data: {
        job_id: values.jobId,
        package_id: values.packageId,
        provider_variant_id: values.variantId,
      },
    },
    data: {
      type: "orders",
      id: values.orderId,
      attributes: {
        amount_cents: packageAmount(values.variantId),
        currency: "USD",
        customer_id: "e2e-customer",
      },
    },
  };
}

test.describe("employer payments", () => {
  test.setTimeout(90_000);

  test("posts, publishes, renews live, and renews again after a refund", async ({ page }) => {
    const fixture = await createUnonboardedUser();
    const title = `E2E Payment ${fixture.suffix}`;
    try {
      await createCompany(page, fixture);
      await fillJob(page, title);
      await page.getByRole("button", { name: "Continue to payment" }).click();
      await expectCheckoutSuccess(page);
      const first = checkoutValues(page);
      await postWebhook(page, paidPayload(first));
      await page.reload();
      await expect(page.getByText("Your job is live", { exact: true })).toBeVisible();

      await page.goto("/dashboard");
      const liveRow = page.getByRole("row").filter({ hasText: title });
      await expect(liveRow).toContainText("Live");
      const firstExpiry = await liveRow.textContent();
      await liveRow.getByRole("button", { name: `Actions for ${title}` }).click();
      await page.getByRole("menuitem", { name: "Pay / renew" }).click();
      await page.getByRole("button", { name: "Renew listing" }).click();
      await expectCheckoutSuccess(page);
      const renewal = checkoutValues(page);
      expect(renewal.orderId).not.toBe(first.orderId);
      await postWebhook(page, paidPayload(renewal));
      await page.reload();
      await expect(page.getByText("Your job is live", { exact: true })).toBeVisible();
      await page.goto("/dashboard");
      const renewedRow = page.getByRole("row").filter({ hasText: title });
      await expect(renewedRow).toContainText("Live");
      expect(await renewedRow.textContent()).not.toBe(firstExpiry);

      await postWebhook(page, {
        meta: {
          event_name: "order_refunded",
          custom_data: { job_id: renewal.jobId },
        },
        data: { type: "orders", id: renewal.orderId, attributes: {} },
      });
      await page.reload();
      await expect(page.getByRole("tab", { name: /Closed/ })).toContainText("1");
      await page.getByRole("tab", { name: /Closed/ }).click();
      const expiredRow = page.getByRole("row").filter({ hasText: title });
      await expect(expiredRow).toContainText("Expired");
      await expiredRow.getByRole("button", { name: `Actions for ${title}` }).click();
      await page.getByRole("menuitem", { name: "Renew listing" }).click();
      await page.getByRole("button", { name: "Renew listing" }).click();
      await expectCheckoutSuccess(page);
      const afterExpiry = checkoutValues(page);
      await postWebhook(page, paidPayload(afterExpiry));
      await page.reload();
      await expect(page.getByText("Your job is live", { exact: true })).toBeVisible();

      await expectPublicJob(page, title);
    } finally {
      await fixture.cleanup();
    }
  });

  test("double-clicking checkout starts one browser navigation", async ({ page }) => {
    const fixture = await createUnonboardedUser();
    try {
      await createCompany(page, fixture);
      await fillJob(page, `E2E Payment Double Click ${fixture.suffix}`);
      const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
      await checkoutButton.dblclick();
      await expectCheckoutSuccess(page);
      expect(checkoutValues(page).orderId).toMatch(/^fake-/);
    } finally {
      await fixture.cleanup();
    }
  });
});

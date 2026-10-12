import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCompanyBySlug } from "@/lib/data/companies";
import { getEmployerJobs } from "@/lib/data/jobs";
import type { PaymentProvider } from "@/lib/payments/types";

import { authenticatedClient, type TestClient } from "../helpers/supabase";

const paymentMock = vi.hoisted(() => ({
  provider: {
    createCheckout: vi.fn(),
    parseWebhook: vi.fn(),
  } satisfies PaymentProvider,
}));

vi.mock("@/lib/payments", () => ({
  getPaymentProvider: () => paymentMock.provider,
}));

let sessionClient!: TestClient;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => sessionClient),
}));

import { createCheckout } from "@/lib/actions/payments";

describe("payment actions", () => {
  beforeEach(async () => {
    sessionClient = await authenticatedClient("employer-a@example.test");
    paymentMock.provider.createCheckout.mockReset();
    paymentMock.provider.parseWebhook.mockReset();
    paymentMock.provider.createCheckout.mockResolvedValue({ url: "https://checkout.test/order-1" });
  });

  it("rejects checkout for another employer's job", async () => {
    const employerB = await authenticatedClient("employer-b@example.test");
    const jobs = await getEmployerJobs(
      employerB,
      (await getCompanyBySlug(employerB, "cobalt-research"))?.id ?? "",
    );
    expect(jobs.length).toBeGreaterThan(0);
    const packageRow = await sessionClient.from("packages").select("id").limit(1).single();
    expect(packageRow.error).toBeNull();
    if (!jobs[0] || !packageRow.data) return;

    await expect(createCheckout(jobs[0].id, packageRow.data.id)).resolves.toMatchObject({
      ok: false,
      error: "Job not found.",
    });
    expect(paymentMock.provider.createCheckout).not.toHaveBeenCalled();
  });

  it("derives the provider variant and email from trusted rows", async () => {
    const company = await getCompanyBySlug(sessionClient, "northstar-labs");
    expect(company).not.toBeNull();
    if (!company) return;
    const jobs = await getEmployerJobs(sessionClient, company.id);
    const packageResult = await sessionClient
      .from("packages")
      .select("*")
      .eq("ls_variant_id", "featured-listing-30")
      .single();
    expect(packageResult.error).toBeNull();
    if (!jobs[0] || !packageResult.data) return;

    const result = await createCheckout(jobs[0].id, packageResult.data.id);
    expect(result).toEqual({ ok: true, data: { url: "https://checkout.test/order-1" } });
    expect(paymentMock.provider.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: jobs[0].id,
        packageId: packageResult.data.id,
        providerVariantId: "featured-listing-30",
        email: "employer-a@example.test",
      }),
    );
    const input = paymentMock.provider.createCheckout.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(input).not.toHaveProperty("priceCents");
    expect(input).not.toHaveProperty("durationDays");
  });

  it("rejects malformed identifiers before contacting the provider", async () => {
    await expect(createCheckout("not-a-uuid", "also-not-a-uuid")).resolves.toMatchObject({
      ok: false,
    });
    expect(paymentMock.provider.createCheckout).not.toHaveBeenCalled();
  });

  it("returns a safe error when the provider cannot create checkout", async () => {
    paymentMock.provider.createCheckout.mockRejectedValue(new Error("provider unavailable"));
    const company = await getCompanyBySlug(sessionClient, "northstar-labs");
    expect(company).not.toBeNull();
    if (!company) return;
    const jobs = await getEmployerJobs(sessionClient, company.id);
    const packageResult = await sessionClient.from("packages").select("id").limit(1).single();
    if (!jobs[0] || !packageResult.data) return;

    await expect(createCheckout(jobs[0].id, packageResult.data.id)).resolves.toMatchObject({
      ok: false,
      error: "Could not start checkout. Please try again.",
    });
  });
});

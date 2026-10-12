import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookParseError } from "@/lib/payments/types";

const mocks = vi.hoisted(() => ({
  provider: { parseWebhook: vi.fn() },
  processWebhookEvent: vi.fn(),
  createAdminClient: vi.fn(() => ({ rpc: vi.fn() })),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/payments", () => ({ getPaymentProvider: () => mocks.provider }));
vi.mock("@/lib/payments/processor", () => ({ processWebhookEvent: mocks.processWebhookEvent }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

import { POST } from "@/app/api/webhooks/lemonsqueezy/route";

describe("Lemon Squeezy webhook route", () => {
  beforeEach(() => {
    mocks.provider.parseWebhook.mockReset();
    mocks.processWebhookEvent.mockReset();
    mocks.revalidateTag.mockReset();
    mocks.provider.parseWebhook.mockResolvedValue({
      type: "order_paid",
      jobId: "job-1",
      packageId: "package-1",
      providerVariantId: "variant-1",
      orderId: "order-1",
      providerCustomerId: null,
      amountCents: 4900,
      currency: "USD",
      raw: {},
    });
    mocks.processWebhookEvent.mockResolvedValue({ result: "processed", job_id: "job-1" });
  });

  it("dispatches a valid paid event and invalidates public job tags", async () => {
    const response = await POST(
      new Request("https://example.test", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(200);
    expect(mocks.processWebhookEvent).toHaveBeenCalledWith(
      mocks.createAdminClient.mock.results[0]?.value,
      expect.objectContaining({ type: "order_paid" }),
      "lemonsqueezy",
    );
    expect(mocks.revalidateTag).toHaveBeenNthCalledWith(1, "jobs", "max");
    expect(mocks.revalidateTag).toHaveBeenNthCalledWith(2, "job-job-1", "max");
  });

  it("returns 200 without touching the database for unknown events", async () => {
    mocks.provider.parseWebhook.mockResolvedValue({ type: "ignore", raw: {} });
    const response = await POST(
      new Request("https://example.test", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(200);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.processWebhookEvent).not.toHaveBeenCalled();
  });

  it("returns 400 for signature or payload failures", async () => {
    mocks.provider.parseWebhook.mockRejectedValue(
      new WebhookParseError("Invalid webhook signature."),
    );
    const response = await POST(
      new Request("https://example.test", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 400 when the transition reports an unknown job", async () => {
    mocks.processWebhookEvent.mockResolvedValue({ result: "job_not_found", job_id: "missing" });
    const response = await POST(
      new Request("https://example.test", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(400);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});

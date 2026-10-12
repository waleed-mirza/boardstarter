import { describe, expect, it, vi } from "vitest";

import type { WebhookEvent } from "@/lib/payments/types";

const mocks = vi.hoisted(() => ({
  paid: vi.fn(async () => ({ result: "paid" })),
  refunded: vi.fn(async () => ({ result: "refunded" })),
}));

vi.mock("@/lib/data/orders", () => ({
  processPaidOrder: mocks.paid,
  processRefundedOrder: mocks.refunded,
}));

import { processWebhookEvent } from "@/lib/payments/processor";

const client = {} as Parameters<typeof processWebhookEvent>[0];
const raw = {} as WebhookEvent["raw"];

describe("payment webhook processor", () => {
  it("ignores unsupported and subscription events", async () => {
    await expect(processWebhookEvent(client, { type: "ignore", raw })).resolves.toEqual({
      result: "ignored",
    });
    await expect(
      processWebhookEvent(client, {
        type: "subscription_changed",
        companyId: "company-1",
        activeUntil: null,
        raw,
      }),
    ).resolves.toEqual({ result: "ignored" });
    expect(mocks.paid).not.toHaveBeenCalled();
    expect(mocks.refunded).not.toHaveBeenCalled();
  });

  it("dispatches paid and refunded events to the data layer", async () => {
    const paid = {
      type: "order_paid" as const,
      jobId: "job-1",
      packageId: "package-1",
      providerVariantId: "variant-1",
      orderId: "order-1",
      providerCustomerId: null,
      amountCents: 4900,
      currency: "USD",
      raw,
    };
    const refunded = { type: "order_refunded" as const, orderId: "order-1", jobId: "job-1", raw };
    await expect(processWebhookEvent(client, paid)).resolves.toEqual({ result: "paid" });
    await expect(processWebhookEvent(client, refunded)).resolves.toEqual({ result: "refunded" });
    expect(mocks.paid).toHaveBeenCalledWith(client, paid, "lemonsqueezy");
    expect(mocks.refunded).toHaveBeenCalledWith(client, refunded, "lemonsqueezy");
  });
});

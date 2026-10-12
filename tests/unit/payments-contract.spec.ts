import { describe, expect, it } from "vitest";

import { createFakePaymentProvider, FakePaymentProvider } from "@/lib/payments/fake";
import { PaymentProviderError, WebhookParseError } from "@/lib/payments/types";
import { signWebhookBody } from "@/lib/payments/signature";

const SECRET = "week-six-contract-secret";

function envelope(eventName: string, orderId: string, custom: Record<string, string> = {}) {
  return {
    meta: { event_name: eventName, custom_data: custom },
    data: {
      type: "orders",
      id: orderId,
      attributes: { amount_cents: 4900, currency: "USD", customer_id: "customer-1" },
    },
  };
}

async function parse(provider: FakePaymentProvider, event: Record<string, unknown>) {
  const { body, signature } = FakePaymentProvider.signedBody(
    event as Record<string, never>,
    SECRET,
  );
  return provider.parseWebhook(
    new Request("https://example.test", {
      method: "POST",
      headers: { "X-Signature": signature },
      body,
    }),
  );
}

describe("payment provider contract", () => {
  it("supports purchase, refund, renew, and duplicate deliveries through one interface", async () => {
    const provider = new FakePaymentProvider({ secret: SECRET });
    const checkout = await provider.createCheckout({
      jobId: "job-1",
      packageId: "package-1",
      providerVariantId: "variant-1",
      email: "employer@example.test",
      redirectUrl: "https://jobs.example.test/dashboard/billing/success?jobId=job-1",
    });
    expect(checkout.url).toContain("fake_checkout=1");
    expect(provider.checkouts).toHaveLength(1);

    await expect(
      parse(
        provider,
        envelope("order_created", "order-1", {
          job_id: "job-1",
          package_id: "package-1",
          provider_variant_id: "variant-1",
        }),
      ),
    ).resolves.toMatchObject({ type: "order_paid", orderId: "order-1", amountCents: 4900 });
    await expect(
      parse(provider, envelope("order_created", "order-1", { job_id: "job-1" })),
    ).resolves.toMatchObject({ type: "order_paid" });
    await expect(parse(provider, envelope("order_refunded", "order-1"))).resolves.toMatchObject({
      type: "order_refunded",
      orderId: "order-1",
    });
    await expect(
      parse(provider, envelope("order_created", "renewal-1", { job_id: "job-1" })),
    ).resolves.toMatchObject({ type: "order_paid", orderId: "renewal-1" });
  });

  it("maps unsupported provider events to ignore", async () => {
    const provider = new FakePaymentProvider({ secret: SECRET });
    const unsupported = { meta: { event_name: "customer_updated" } };
    await expect(parse(provider, unsupported)).resolves.toMatchObject({ type: "ignore" });
  });

  it("rejects malformed, unsigned, and incomplete fake deliveries", async () => {
    const provider = new FakePaymentProvider({ secret: SECRET });
    const malformedJson = "not-json";
    await expect(
      provider.parseWebhook(
        new Request("https://example.test", {
          method: "POST",
          headers: { "X-Signature": signWebhookBody(malformedJson, SECRET) },
          body: malformedJson,
        }),
      ),
    ).rejects.toBeInstanceOf(WebhookParseError);

    const malformedPayload = JSON.stringify({ meta: { event_name: "order_created" } });
    await expect(
      provider.parseWebhook(
        new Request("https://example.test", {
          method: "POST",
          headers: { "X-Signature": signWebhookBody(malformedPayload, SECRET) },
          body: malformedPayload,
        }),
      ),
    ).rejects.toThrow("payload is malformed");

    const incomplete = envelope("order_created", "order-2", { job_id: "job-1" });
    delete (incomplete.data.attributes as Record<string, unknown>).amount_cents;
    await expect(parse(provider, incomplete)).rejects.toThrow("Missing required paid-order data");
  });

  it("requires a secret when the fake adapter is created", () => {
    expect(() => createFakePaymentProvider("")).toThrow(PaymentProviderError);
    expect(createFakePaymentProvider(SECRET)).toBeInstanceOf(FakePaymentProvider);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { signWebhookBody } from "@/lib/payments/signature";
import { createLemonSqueezyProvider } from "@/lib/payments/lemonsqueezy";
import { PaymentProviderError, WebhookParseError } from "@/lib/payments/types";

const SECRET = "week-six-webhook-secret";

function signedRequest(payload: Record<string, unknown>): Request {
  const body = JSON.stringify(payload);
  return new Request("https://example.test/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "X-Signature": signWebhookBody(body, SECRET) },
    body,
  });
}

function paidPayload(overrides: Record<string, unknown> = {}) {
  return {
    meta: {
      event_name: "order_created",
      custom_data: { job_id: "job-1", package_id: "package-1" },
    },
    data: {
      type: "orders",
      id: "order-1",
      attributes: {
        customer_id: 42,
        currency: "USD",
        total: 5390,
        first_order_item: { variant_id: 123, price: 4900 },
      },
    },
    ...overrides,
  };
}

describe("Lemon Squeezy provider", () => {
  it("creates a JSON:API checkout with trusted variant and custom job data", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ data: { attributes: { url: "https://lemonsqueezy.test/checkout/1" } } }),
          {
            status: 201,
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const provider = createLemonSqueezyProvider({
        apiKey: "test-api-key",
        storeId: "store-1",
        webhookSecret: SECRET,
      });
      const result = await provider.createCheckout({
        jobId: "job-1",
        packageId: "package-1",
        providerVariantId: "123",
        email: "employer@example.test",
        redirectUrl: "https://jobs.example.test/dashboard/billing/success?jobId=job-1",
      });
      expect(result).toEqual({ url: "https://lemonsqueezy.test/checkout/1" });
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe("https://api.lemonsqueezy.com/v1/checkouts");
      expect(init.method).toBe("POST");
      const request = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(request).toMatchObject({
        data: {
          relationships: {
            store: { data: { id: "store-1" } },
            variant: { data: { id: "123" } },
          },
          attributes: {
            checkout_data: {
              email: "employer@example.test",
              custom: { job_id: "job-1", package_id: "package-1" },
            },
          },
        },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("surfaces provider and malformed checkout responses without leaking details", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 502 })),
    );
    await expect(
      provider.createCheckout({
        jobId: "job-1",
        packageId: "package-1",
        providerVariantId: "123",
        email: "employer@example.test",
        redirectUrl: "https://jobs.example.test/success",
      }),
    ).rejects.toMatchObject({ code: "response" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not-json", { status: 201 })),
    );
    await expect(
      provider.createCheckout({
        jobId: "job-1",
        packageId: "package-1",
        providerVariantId: "123",
        email: "employer@example.test",
        redirectUrl: "https://jobs.example.test/success",
      }),
    ).rejects.toBeInstanceOf(PaymentProviderError);

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ data: { attributes: {} } }), { status: 201 }),
      ),
    );
    await expect(
      provider.createCheckout({
        jobId: "job-1",
        packageId: "package-1",
        providerVariantId: "123",
        email: "employer@example.test",
        redirectUrl: "https://jobs.example.test/success",
      }),
    ).rejects.toThrow("checkout URL");
    vi.unstubAllGlobals();
  });

  it("normalizes order_created into a paid event using the order item price", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    const event = await provider.parseWebhook(signedRequest(paidPayload()));
    expect(event).toMatchObject({
      type: "order_paid",
      jobId: "job-1",
      packageId: "package-1",
      providerVariantId: "123",
      orderId: "order-1",
      providerCustomerId: "42",
      amountCents: 4900,
      currency: "USD",
    });
  });

  it("parses the checked-in test-mode webhook fixtures", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    const body = readFileSync(
      resolve(process.cwd(), "tests/fixtures/webhooks/lemonsqueezy-order-created.json"),
      "utf8",
    );
    const event = await provider.parseWebhook(
      new Request("https://example.test", {
        method: "POST",
        headers: { "X-Signature": signWebhookBody(body, SECRET) },
        body,
      }),
    );
    expect(event).toMatchObject({
      type: "order_paid",
      jobId: "00000000-0000-0000-0000-000000000001",
      providerVariantId: "1002",
      amountCents: 4900,
    });
  });

  it("falls back to order totals and top-level variant IDs", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    const event = await provider.parseWebhook(
      signedRequest({
        meta: { event_name: "order_created", custom_data: { job_id: "job-2" } },
        data: {
          type: "orders",
          id: "order-2",
          attributes: { customer_id: "customer", currency: "EUR", total: 12900, variant_id: 456 },
        },
      }),
    );
    expect(event).toMatchObject({ amountCents: 12900, currency: "EUR", providerVariantId: "456" });
  });

  it("normalizes order_refunded and tolerates absent custom job data", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    const event = await provider.parseWebhook(
      signedRequest({
        meta: { event_name: "order_refunded" },
        data: { type: "orders", id: "order-1", attributes: {} },
      }),
    );
    expect(event).toMatchObject({ type: "order_refunded", orderId: "order-1", jobId: null });
  });

  it("returns ignore for an unknown event", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    const event = await provider.parseWebhook(
      signedRequest({
        meta: { event_name: "customer_updated" },
      }),
    );
    expect(event.type).toBe("ignore");
  });

  it("rejects a paid event without custom job data", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    await expect(
      provider.parseWebhook(
        signedRequest({
          meta: { event_name: "order_created", custom_data: {} },
          data: { type: "orders", id: "order-1", attributes: { currency: "USD", total: 4900 } },
        }),
      ),
    ).rejects.toBeInstanceOf(WebhookParseError);
  });

  it("rejects a malformed signature before parsing the body", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "X-Signature": "nope" },
      body: JSON.stringify(paidPayload()),
    });
    await expect(provider.parseWebhook(request)).rejects.toThrow("Invalid webhook signature");
  });

  it("rejects invalid JSON and malformed envelopes after signature verification", async () => {
    const provider = createLemonSqueezyProvider({
      apiKey: "key",
      storeId: "store",
      webhookSecret: SECRET,
    });
    const body = "not-json";
    await expect(
      provider.parseWebhook(
        new Request("https://example.test", {
          method: "POST",
          headers: { "X-Signature": signWebhookBody(body, SECRET) },
          body,
        }),
      ),
    ).rejects.toThrow("not valid JSON");

    const malformed = JSON.stringify({ meta: { event_name: "order_created" } });
    await expect(
      provider.parseWebhook(
        new Request("https://example.test", {
          method: "POST",
          headers: { "X-Signature": signWebhookBody(malformed, SECRET) },
          body: malformed,
        }),
      ),
    ).rejects.toThrow("payload is malformed");
  });

  it("requires each Lemon Squeezy environment value when no config is supplied", () => {
    vi.stubEnv("LEMONSQUEEZY_API_KEY", "");
    vi.stubEnv("LEMONSQUEEZY_STORE_ID", "");
    vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", "");
    expect(() => createLemonSqueezyProvider()).toThrow("apiKey");
    vi.stubEnv("LEMONSQUEEZY_API_KEY", "key");
    expect(() => createLemonSqueezyProvider()).toThrow("storeId");
    vi.stubEnv("LEMONSQUEEZY_STORE_ID", "store");
    expect(() => createLemonSqueezyProvider()).toThrow("webhookSecret");
    vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", SECRET);
    expect(createLemonSqueezyProvider()).toBeInstanceOf(Object);
    vi.unstubAllEnvs();
  });
});

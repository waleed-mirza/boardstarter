import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { Json } from "@/lib/supabase/types";

import { signWebhookBody, verifyWebhookSignature } from "./signature";
import type { CheckoutInput, PaymentProvider, WebhookEvent } from "./types";
import { PaymentProviderError, WebhookParseError } from "./types";

type FakeConfig = {
  secret: string;
};

const dataSchema = z.object({
  id: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()),
});

const fakeEnvelope = z.object({
  meta: z.object({
    event_name: z.string(),
    custom_data: z.record(z.string(), z.unknown()).optional(),
  }),
  data: z.unknown().optional(),
});

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function integerValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function currencyValue(value: unknown): string | null {
  const currency = stringValue(value)?.toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function requiredData(value: unknown): z.infer<typeof dataSchema> {
  const parsed = dataSchema.safeParse(value);
  if (!parsed.success) throw new WebhookParseError("Webhook payload is malformed.");
  return parsed.data;
}

export class FakePaymentProvider implements PaymentProvider {
  readonly providerId = "fake";
  readonly checkouts: CheckoutInput[] = [];

  constructor(private readonly config: FakeConfig) {}

  async createCheckout(input: CheckoutInput): Promise<{ url: string }> {
    this.checkouts.push(input);
    const url = new URL(input.redirectUrl);
    url.searchParams.set("fake_checkout", "1");
    url.searchParams.set("fake_job_id", input.jobId);
    url.searchParams.set("fake_package_id", input.packageId);
    url.searchParams.set("fake_variant_id", input.providerVariantId);
    url.searchParams.set("fake_order_id", `fake-${input.jobId}-${randomUUID()}`);
    return { url: url.toString() };
  }

  async parseWebhook(request: Request): Promise<WebhookEvent> {
    const body = await request.text();
    if (!verifyWebhookSignature(body, request.headers.get("X-Signature"), this.config.secret)) {
      throw new WebhookParseError("Invalid webhook signature.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body) as unknown;
    } catch {
      throw new WebhookParseError("Webhook body is not valid JSON.");
    }
    const result = fakeEnvelope.safeParse(parsed);
    if (!result.success) throw new WebhookParseError("Webhook payload is malformed.");

    const custom = result.data.meta.custom_data ?? {};
    const eventName = result.data.meta.event_name;
    const raw = parsed as Json;
    if (eventName !== "order_created" && eventName !== "order_refunded") {
      return { type: "ignore", raw };
    }
    const data = requiredData(result.data.data);

    if (eventName === "order_created") {
      const jobId = stringValue(custom.job_id);
      const amountCents = integerValue(data.attributes.amount_cents);
      const currency = currencyValue(data.attributes.currency);
      if (!jobId || amountCents === null || !currency) {
        throw new WebhookParseError("Missing required paid-order data.");
      }
      return {
        type: "order_paid",
        jobId,
        packageId: stringValue(custom.package_id),
        providerVariantId: stringValue(custom.provider_variant_id),
        orderId: data.id,
        providerCustomerId: stringValue(data.attributes.customer_id),
        amountCents,
        currency,
        raw,
      };
    }
    return {
      type: "order_refunded",
      orderId: data.id,
      jobId: stringValue(custom.job_id),
      raw,
    };
  }

  static signedBody(
    event: Record<string, Json>,
    secret: string,
  ): { body: string; signature: string } {
    const body = JSON.stringify(event);
    return { body, signature: signWebhookBody(body, secret) };
  }
}

export function createFakePaymentProvider(secret: string): PaymentProvider {
  if (!secret) throw new PaymentProviderError("Fake payment secret is missing.", "configuration");
  return new FakePaymentProvider({ secret });
}

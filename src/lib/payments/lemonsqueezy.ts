import "server-only";

import { z } from "zod";

import type { Json } from "@/lib/supabase/types";

import { verifyWebhookSignature } from "./signature";
import {
  PaymentProviderError,
  type CheckoutInput,
  type PaymentProvider,
  type WebhookEvent,
  WebhookParseError,
} from "./types";

type LemonConfig = {
  apiKey: string;
  storeId: string;
  webhookSecret: string;
};

const dataSchema = z.object({
  type: z.string(),
  id: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()),
});

const envelopeSchema = z.object({
  meta: z.object({
    event_name: z.string(),
    custom_data: z.record(z.string(), z.unknown()).optional(),
  }),
  data: z.unknown().optional(),
});

function requiredEnv(name: keyof LemonConfig): string {
  let value: string | undefined;
  switch (name) {
    case "apiKey":
      value = process.env.LEMONSQUEEZY_API_KEY;
      break;
    case "storeId":
      value = process.env.LEMONSQUEEZY_STORE_ID;
      break;
    case "webhookSecret":
      value = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
      break;
  }
  if (!value)
    throw new PaymentProviderError(
      `Missing Lemon Squeezy configuration: ${name}.`,
      "configuration",
    );
  return value;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function asCurrency(value: unknown): string | null {
  const currency = asString(value)?.toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstOrderItem(attributes: Record<string, unknown>): Record<string, unknown> | null {
  return nestedRecord(attributes.first_order_item);
}

function requiredData(value: unknown): z.infer<typeof dataSchema> {
  const parsed = dataSchema.safeParse(value);
  if (!parsed.success) throw new WebhookParseError("Webhook payload is malformed.");
  return parsed.data;
}

function normalizeOrderCreated(parsed: z.infer<typeof envelopeSchema>, raw: Json): WebhookEvent {
  const data = requiredData(parsed.data);
  const custom = parsed.meta.custom_data ?? {};
  const jobId = asString(custom.job_id);
  if (!jobId) throw new WebhookParseError("Missing meta.custom_data.job_id.");

  const item = firstOrderItem(data.attributes);
  const amountCents = asInteger(item?.price) ?? asInteger(data.attributes.total);
  const currency = asCurrency(data.attributes.currency);
  const providerVariantId = asString(item?.variant_id) ?? asString(data.attributes.variant_id);
  if (amountCents === null || !currency || !providerVariantId) {
    throw new WebhookParseError("Missing order amount, currency, or variant.");
  }

  return {
    type: "order_paid",
    jobId,
    packageId: asString(custom.package_id),
    providerVariantId,
    orderId: data.id,
    providerCustomerId: asString(data.attributes.customer_id),
    amountCents,
    currency,
    raw,
  };
}

export class LemonSqueezyProvider implements PaymentProvider {
  readonly providerId = "lemonsqueezy";

  constructor(private readonly config: LemonConfig) {}

  async createCheckout(input: CheckoutInput): Promise<{ url: string }> {
    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            product_options: { redirect_url: input.redirectUrl },
            checkout_data: {
              email: input.email,
              custom: {
                job_id: input.jobId,
                package_id: input.packageId,
              },
            },
          },
          relationships: {
            store: { data: { type: "stores", id: this.config.storeId } },
            variant: { data: { type: "variants", id: input.providerVariantId } },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new PaymentProviderError(
        `Lemon Squeezy checkout request failed (${response.status}).`,
        "response",
      );
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new PaymentProviderError("Lemon Squeezy returned invalid checkout JSON.", "payload");
    }
    const data = nestedRecord(payload)?.data;
    const attributes = nestedRecord(nestedRecord(data)?.attributes);
    const url = attributes ? asString(attributes.url) : null;
    if (!url)
      throw new PaymentProviderError("Lemon Squeezy did not return a checkout URL.", "payload");
    return { url };
  }

  async parseWebhook(request: Request): Promise<WebhookEvent> {
    const body = await request.text();
    if (
      !verifyWebhookSignature(body, request.headers.get("X-Signature"), this.config.webhookSecret)
    ) {
      throw new WebhookParseError("Invalid webhook signature.");
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(body) as unknown;
    } catch {
      throw new WebhookParseError("Webhook body is not valid JSON.");
    }
    const parsed = envelopeSchema.safeParse(decoded);
    if (!parsed.success) throw new WebhookParseError("Webhook payload is malformed.");
    const envelope = parsed.data;
    const raw = decoded as Json;
    const eventName = envelope.meta.event_name;
    if (eventName === "order_created") return normalizeOrderCreated(envelope, raw);
    if (eventName === "order_refunded") {
      const data = requiredData(envelope.data);
      return {
        type: "order_refunded",
        orderId: data.id,
        jobId: asString(envelope.meta.custom_data?.job_id),
        raw,
      };
    }
    return { type: "ignore", raw };
  }
}

export function createLemonSqueezyProvider(config?: Partial<LemonConfig>): PaymentProvider {
  return new LemonSqueezyProvider({
    apiKey: config?.apiKey ?? requiredEnv("apiKey"),
    storeId: config?.storeId ?? requiredEnv("storeId"),
    webhookSecret: config?.webhookSecret ?? requiredEnv("webhookSecret"),
  });
}

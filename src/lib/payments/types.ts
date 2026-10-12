import type { Json } from "@/lib/supabase/types";

export type CheckoutInput = {
  jobId: string;
  /** Boardstarter package UUID, resolved and validated by the Server Action. */
  packageId: string;
  /** Provider variant identifier, never supplied by the browser. */
  providerVariantId: string;
  email: string;
  redirectUrl: string;
};

export type WebhookEvent =
  | {
      type: "order_paid";
      jobId: string;
      packageId: string | null;
      providerVariantId: string | null;
      orderId: string;
      providerCustomerId: string | null;
      amountCents: number;
      currency: string;
      raw: Json;
    }
  | {
      type: "order_refunded";
      orderId: string;
      jobId: string | null;
      raw: Json;
    }
  | {
      type: "subscription_changed";
      companyId: string;
      activeUntil: string | null;
      raw: Json;
    }
  | { type: "ignore"; raw: Json };

export type PaymentProvider = {
  /** Stable value used for idempotency keys and order attribution. */
  readonly providerId?: string;
  createCheckout(input: CheckoutInput): Promise<{ url: string }>;
  parseWebhook(request: Request): Promise<WebhookEvent>;
};

export class PaymentProviderError extends Error {
  readonly code: "configuration" | "request" | "response" | "payload";

  constructor(message: string, code: "configuration" | "request" | "response" | "payload") {
    super(message);
    this.name = "PaymentProviderError";
    this.code = code;
  }
}

export class WebhookParseError extends PaymentProviderError {
  readonly status = 400;

  constructor(message: string) {
    super(message, "payload");
    this.name = "WebhookParseError";
  }
}

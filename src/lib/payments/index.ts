import "server-only";

import { createFakePaymentProvider } from "./fake";
import { createLemonSqueezyProvider } from "./lemonsqueezy";
import type { PaymentProvider } from "./types";

/** Fake mode is intentionally opt-in for deterministic local/E2E runs. */
export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMENT_PROVIDER === "fake") {
    return createFakePaymentProvider(process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "");
  }
  return createLemonSqueezyProvider();
}

export type { CheckoutInput, PaymentProvider, WebhookEvent } from "./types";

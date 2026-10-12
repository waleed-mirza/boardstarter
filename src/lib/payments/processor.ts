import type { DatabaseClient } from "@/lib/data/types";
import {
  processPaidOrder,
  processRefundedOrder,
  type PaymentProcessResult,
} from "@/lib/data/orders";

import type { WebhookEvent } from "./types";

export async function processWebhookEvent(
  client: DatabaseClient,
  event: WebhookEvent,
  provider = "lemonsqueezy",
): Promise<PaymentProcessResult | { result: "ignored" }> {
  if (event.type === "ignore") return { result: "ignored" };
  if (event.type === "subscription_changed") return { result: "ignored" };
  if (event.type === "order_paid") return processPaidOrder(client, event, provider);
  return processRefundedOrder(client, event, provider);
}

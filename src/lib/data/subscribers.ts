import type { AlertFrequency } from "@/lib/data/types";

import type { DatabaseClient, SubscriberRow } from "./types";

export type SubscriberPreferences = {
  email: string;
  categories: string[];
  frequency: AlertFrequency;
};

export type SubscriptionResult = Pick<SubscriberRow, "id" | "email">;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function subscribeToAlerts(
  client: DatabaseClient,
  input: { email: string; categories: string[]; frequency: AlertFrequency },
): Promise<SubscriptionResult> {
  const { data, error } = await client.rpc("subscribe_to_alerts", {
    p_email: normalizeEmail(input.email),
    p_categories: input.categories,
    p_frequency: input.frequency,
  });
  if (error) throw new Error(error.message);
  const payload = data as { id?: string; email?: string };
  if (!payload.id || !payload.email) throw new Error("Subscription could not be created.");
  return { id: payload.id, email: payload.email };
}

export async function confirmAlertSubscription(
  client: DatabaseClient,
  email: string,
  token: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("confirm_alert_subscription", {
    p_email: normalizeEmail(email),
    p_token: token,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function unsubscribeAlertSubscription(
  client: DatabaseClient,
  email: string,
  token: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("unsubscribe_alert_subscription", {
    p_email: normalizeEmail(email),
    p_token: token,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

import type { EmailQueueRow, DatabaseClient } from "./types";

export type EmailQueueItem = EmailQueueRow;

export type ClaimedEmailQueue = {
  claimToken: string;
  items: EmailQueueItem[];
};

function asQueueItem(value: unknown): EmailQueueItem {
  if (!value || typeof value !== "object") throw new Error("Invalid email queue item.");
  return value as EmailQueueItem;
}

export async function enqueueDueDigests(client: DatabaseClient): Promise<number> {
  const { data, error } = await client.rpc("enqueue_due_digests");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function enqueueRenewalNudges(client: DatabaseClient): Promise<number> {
  const { data, error } = await client.rpc("enqueue_renewal_nudges");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function claimEmailQueue(
  client: DatabaseClient,
  limit = 25,
  claimToken = crypto.randomUUID(),
): Promise<ClaimedEmailQueue> {
  const { data, error } = await client.rpc("claim_email_queue", {
    p_limit: limit,
    p_claim_token: claimToken,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid email queue response.");
  const result = data as { claimToken?: string; items?: unknown[] };
  if (!result.claimToken || !Array.isArray(result.items))
    throw new Error("Invalid email queue response.");
  return { claimToken: result.claimToken, items: result.items.map(asQueueItem) };
}

export async function markEmailSent(
  client: DatabaseClient,
  id: string,
  claimToken: string,
  providerMessageId?: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("mark_email_sent", {
    p_id: id,
    p_claim_token: claimToken,
    p_provider_message_id: providerMessageId ?? null,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function markEmailFailed(
  client: DatabaseClient,
  id: string,
  claimToken: string,
  message: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("mark_email_failed", {
    p_id: id,
    p_claim_token: claimToken,
    p_error: message,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

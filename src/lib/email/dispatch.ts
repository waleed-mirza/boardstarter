import type { DatabaseClient } from "@/lib/data/types";
import { claimEmailQueue, markEmailFailed, markEmailSent } from "@/lib/data/email-queue";

import { signAlertToken } from "./tokens";
import { renderEmail } from "./render";
import type { EmailProvider, EmailTemplateName } from "./types";

export type DispatchResult = { claimed: number; sent: number; failed: number };

function isTemplate(value: string): value is EmailTemplateName {
  return [
    "alert_confirmation",
    "job_digest",
    "job_live",
    "job_expiry",
    "job_pending_review",
  ].includes(value);
}

function preparePayload(template: EmailTemplateName, value: unknown, siteUrl: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if (template === "alert_confirmation") {
    const payload = value as { email?: string; token?: string };
    if (!payload.email || !payload.token) return value;
    const token = signAlertToken({
      email: payload.email,
      nonce: payload.token,
      purpose: "confirm",
    });
    return {
      email: payload.email,
      confirmationUrl: new URL(
        `/alerts/confirm?token=${encodeURIComponent(token)}`,
        siteUrl,
      ).toString(),
    };
  }
  if (template !== "job_digest") return value;
  const payload = value as {
    email?: string;
    token?: string;
    jobs?: unknown[];
    frequency?: "daily" | "weekly";
  };
  if (!payload.email || !payload.token || !payload.jobs || !payload.frequency) return value;
  const token = signAlertToken({
    email: payload.email,
    nonce: payload.token,
    purpose: "unsubscribe",
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });
  return {
    email: payload.email,
    jobs: payload.jobs,
    frequency: payload.frequency,
    unsubscribeUrl: new URL(
      `/alerts/unsubscribe?token=${encodeURIComponent(token)}`,
      siteUrl,
    ).toString(),
  };
}

export async function dispatchEmailQueue(
  client: DatabaseClient,
  provider: EmailProvider,
  siteUrl: string,
  limit = 25,
): Promise<DispatchResult> {
  const claimed = await claimEmailQueue(client, limit);
  let sent = 0;
  let failed = 0;
  for (const item of claimed.items) {
    if (!isTemplate(item.template)) {
      await markEmailFailed(client, item.id, claimed.claimToken, "Unsupported email template.");
      failed += 1;
      continue;
    }
    try {
      const payload = preparePayload(item.template, item.payload, siteUrl);
      const message = await renderEmail(
        item.template,
        item.to_email,
        payload,
        siteUrl,
        item.dedupe_key,
      );
      const result = await provider.send(message);
      if (await markEmailSent(client, item.id, claimed.claimToken, result.id)) sent += 1;
    } catch (error) {
      await markEmailFailed(
        client,
        item.id,
        claimed.claimToken,
        error instanceof Error ? error.message : "Email delivery failed.",
      );
      failed += 1;
    }
  }
  return { claimed: claimed.items.length, sent, failed };
}

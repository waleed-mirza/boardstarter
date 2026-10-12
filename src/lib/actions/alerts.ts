"use server";

import { subscribeToAlerts } from "@/lib/data/subscribers";
import { consumeRateLimit } from "@/lib/data/rate-limit";
import { rateLimitKey } from "@/lib/security/request";
import { createClient } from "@/lib/supabase/server";
import { alertSubscriptionSchema } from "@/lib/validation/alerts";
import { headers } from "next/headers";

export type AlertActionResult = { ok: true } | { ok: false; error: string; field?: string };

function inputFromFormData(formData: FormData): unknown {
  return {
    email: formData.get("email"),
    categories: formData.getAll("categories"),
    frequency: formData.get("frequency") ?? "weekly",
  };
}

export async function subscribeToJobAlerts(input: unknown): Promise<AlertActionResult> {
  const raw = input instanceof FormData ? inputFromFormData(input) : input;
  const parsed = alertSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Please check your alert preferences.",
      field: issue?.path[0]?.toString(),
    };
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const client = await createClient();
    try {
      const requestHeaders = await headers();
      if (!(await consumeRateLimit(client, rateLimitKey("alert", requestHeaders), 5, 3600))) {
        return { ok: false, error: "Please wait before requesting another alert." };
      }
    } catch (error) {
      // Unit callers do not have a Next request scope; a real server action does.
      if (!(error instanceof Error && error.message.includes("outside a request scope"))) throw error;
    }
    await subscribeToAlerts(client, { ...parsed.data, email });
    return { ok: true };
  } catch (error) {
    console.warn("alert_subscription_failed", error instanceof Error ? error.message : "unknown error");
    return {
      ok: false,
      error: "Could not queue the confirmation email. Please try again.",
    };
  }
}

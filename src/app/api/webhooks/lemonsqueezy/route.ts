import { revalidateTag } from "next/cache";

import { processWebhookEvent } from "@/lib/payments/processor";
import { getPaymentProvider } from "@/lib/payments";
import { WebhookParseError, type PaymentProvider, type WebhookEvent } from "@/lib/payments/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitGoogleIndexingBestEffort } from "@/lib/seo/indexing";
import { getJobSlugForIndexing } from "@/lib/data/seo";

function logWebhook(input: {
  event: string;
  orderId?: string;
  jobId?: string | null;
  result: string;
}): void {
  console.info(
    JSON.stringify({
      scope: "payment_webhook",
      event: input.event,
      orderId: input.orderId ?? null,
      jobId: input.jobId ?? null,
      result: input.result,
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let event: WebhookEvent;
  let provider: PaymentProvider;
  try {
    provider = getPaymentProvider();
    event = await provider.parseWebhook(request);
  } catch (error) {
    if (error instanceof WebhookParseError) {
      logWebhook({ event: "invalid", result: error.message });
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }
    console.error(
      JSON.stringify({
        scope: "payment_webhook",
        event: "parse_failed",
        orderId: null,
        jobId: null,
        result: "error",
      }),
    );
    return Response.json({ ok: false, error: "Could not parse webhook." }, { status: 500 });
  }

  if (event.type === "ignore" || event.type === "subscription_changed") {
    logWebhook({
      event: event.type,
      result: "ignored",
    });
    return Response.json({ ok: true });
  }

  const orderId =
    event.type === "order_paid" || event.type === "order_refunded" ? event.orderId : undefined;
  const jobId = event.jobId;

  try {
    // Provider callbacks are unauthenticated; RLS cannot perform this atomic transition.
    const admin = createAdminClient();
    const result = await processWebhookEvent(admin, event, provider.providerId ?? "lemonsqueezy");
    logWebhook({ event: event.type, orderId, jobId, result: result.result });

    if (result.result === "job_not_found" || result.result === "package_not_found") {
      return Response.json(
        { ok: false, error: "Webhook references an unknown job or package." },
        { status: 400 },
      );
    }
    if ("job_id" in result && result.job_id) {
      revalidateTag("jobs", "max");
      revalidateTag(`job-${result.job_id}`, "max");
      if (result.status === "published" || result.status === "expired") {
        try {
          const slug = await getJobSlugForIndexing(admin, result.job_id);
          if (slug) {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
            const jobUrl = new URL(`/jobs/${slug}`, siteUrl).toString();
            await submitGoogleIndexingBestEffort(
              jobUrl,
              result.status === "published" ? "URL_UPDATED" : "URL_DELETED",
            );
          }
        } catch (error) {
          console.warn(
            JSON.stringify({
              scope: "google_indexing",
              result: "lookup_error",
              message: error instanceof Error ? error.message : "lookup failed",
            }),
          );
        }
      }
    }
    return Response.json({ ok: true, result: result.result });
  } catch {
    logWebhook({ event: event.type, orderId, jobId, result: "error" });
    return Response.json({ ok: false, error: "Webhook processing failed." }, { status: 500 });
  }
}

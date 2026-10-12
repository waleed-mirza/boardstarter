import { render } from "@react-email/render";
import { z } from "zod";

import { AlertConfirmationEmail } from "@/components/email/alert-confirmation";
import { EmailLayout } from "@/components/email/email-layout";
import { ExpiryNudgeEmail } from "@/components/email/expiry-nudge";
import { JobDigestEmail } from "@/components/email/job-digest";
import { JobLiveEmail } from "@/components/email/job-live";
import { PendingReviewEmail } from "@/components/email/pending-review";

import type { EmailMessage, EmailPayloadMap, EmailTemplateName } from "./types";

const digestJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  companyName: z.string(),
  companySlug: z.string(),
  categoryName: z.string(),
  categorySlug: z.string(),
  location: z.string().nullable(),
  isRemote: z.boolean(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  currency: z.string(),
  salaryPeriod: z.string(),
  publishedAt: z.string(),
});

const payloadSchemas = {
  alert_confirmation: z.object({ email: z.string(), confirmationUrl: z.string().url() }),
  job_digest: z.object({
    email: z.string(),
    unsubscribeUrl: z.string().url(),
    frequency: z.enum(["daily", "weekly"]),
    jobs: z.array(digestJobSchema),
  }),
  job_live: z.object({
    jobId: z.string(),
    title: z.string(),
    slug: z.string(),
    companyName: z.string(),
    companySlug: z.string(),
    categoryName: z.string(),
    categorySlug: z.string(),
    expiresAt: z.string(),
  }),
  job_expiry: z.object({
    jobId: z.string(),
    title: z.string(),
    slug: z.string(),
    companyName: z.string(),
    companySlug: z.string(),
    expiresAt: z.string(),
  }),
  job_pending_review: z.object({
    jobId: z.string(),
    title: z.string(),
    slug: z.string(),
    companyName: z.string(),
    companySlug: z.string(),
    categoryName: z.string(),
    categorySlug: z.string(),
  }),
} as const;

function subjectFor(
  template: EmailTemplateName,
  payload: EmailPayloadMap[EmailTemplateName],
): string {
  switch (template) {
    case "alert_confirmation":
      return "Confirm your job alerts";
    case "job_digest": {
      const value = payload as EmailPayloadMap["job_digest"];
      return `${value.frequency === "daily" ? "Daily" : "Weekly"} job alert`;
    }
    case "job_live":
      return `Your job is live: ${(payload as EmailPayloadMap["job_live"]).title}`;
    case "job_expiry":
      return `Renew your job: ${(payload as EmailPayloadMap["job_expiry"]).title}`;
    case "job_pending_review":
      return `Job pending review: ${(payload as EmailPayloadMap["job_pending_review"]).title}`;
  }
}

function elementFor(
  template: EmailTemplateName,
  payload: EmailPayloadMap[EmailTemplateName],
  siteUrl: string,
): React.JSX.Element {
  switch (template) {
    case "alert_confirmation": {
      const value = payload as EmailPayloadMap["alert_confirmation"];
      return <AlertConfirmationEmail confirmationUrl={value.confirmationUrl} />;
    }
    case "job_digest": {
      const value = payload as EmailPayloadMap["job_digest"];
      return (
        <JobDigestEmail
          jobs={value.jobs}
          frequency={value.frequency}
          unsubscribeUrl={value.unsubscribeUrl}
          siteUrl={siteUrl}
        />
      );
    }
    case "job_live": {
      const value = payload as EmailPayloadMap["job_live"];
      return (
        <JobLiveEmail
          title={value.title}
          companyName={value.companyName}
          jobUrl={new URL(`/jobs/${value.slug}`, siteUrl).toString()}
          expiresAt={value.expiresAt}
        />
      );
    }
    case "job_expiry": {
      const value = payload as EmailPayloadMap["job_expiry"];
      return (
        <ExpiryNudgeEmail
          title={value.title}
          companyName={value.companyName}
          jobUrl={new URL(`/dashboard/jobs/${value.jobId}/edit`, siteUrl).toString()}
          expiresAt={value.expiresAt}
        />
      );
    }
    case "job_pending_review": {
      const value = payload as EmailPayloadMap["job_pending_review"];
      return (
        <PendingReviewEmail
          title={value.title}
          companyName={value.companyName}
          reviewUrl={new URL(`/admin/jobs/${value.jobId}/preview`, siteUrl).toString()}
        />
      );
    }
  }
}

export async function renderEmail<Name extends EmailTemplateName>(
  template: Name,
  to: string,
  rawPayload: unknown,
  siteUrl: string,
  idempotencyKey?: string,
): Promise<EmailMessage<Name>> {
  const payload = payloadSchemas[template].parse(rawPayload) as EmailPayloadMap[Name];
  const element = elementFor(template, payload, siteUrl);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return {
    to,
    subject: subjectFor(template, payload),
    template,
    payload,
    html,
    text,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
}

export function renderFailureEmailPreview(message: string): React.JSX.Element {
  return (
    <EmailLayout preview="Email preview">
      <p>{message}</p>
    </EmailLayout>
  );
}

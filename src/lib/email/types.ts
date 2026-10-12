export type EmailTemplateName =
  "alert_confirmation" | "job_digest" | "job_live" | "job_expiry" | "job_pending_review";

export type DigestJob = {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companySlug: string;
  categoryName: string;
  categorySlug: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryPeriod: string;
  publishedAt: string;
};

export type EmailPayloadMap = {
  alert_confirmation: { email: string; confirmationUrl: string };
  job_digest: {
    email: string;
    unsubscribeUrl: string;
    frequency: "daily" | "weekly";
    jobs: DigestJob[];
  };
  job_live: {
    jobId: string;
    title: string;
    slug: string;
    companyName: string;
    companySlug: string;
    categoryName: string;
    categorySlug: string;
    expiresAt: string;
  };
  job_expiry: {
    jobId: string;
    title: string;
    slug: string;
    companyName: string;
    companySlug: string;
    expiresAt: string;
  };
  job_pending_review: {
    jobId: string;
    title: string;
    slug: string;
    companyName: string;
    companySlug: string;
    categoryName: string;
    categorySlug: string;
  };
};

export type EmailMessage<Name extends EmailTemplateName = EmailTemplateName> = {
  to: string;
  subject: string;
  template: Name;
  payload: EmailPayloadMap[Name];
  html: string;
  text: string;
  idempotencyKey?: string;
};

export type EmailSendResult = { id?: string };

export interface EmailProvider {
  readonly providerId: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

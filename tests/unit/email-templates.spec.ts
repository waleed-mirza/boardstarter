import { describe, expect, it } from "vitest";

import { renderEmail } from "@/lib/email/render";

const siteUrl = "https://jobs.example.com";
const job = { id: "job-1", title: "Engineer", slug: "engineer-acme", companyName: "Acme", companySlug: "acme", categoryName: "Engineering", categorySlug: "engineering", location: null, isRemote: true, salaryMin: null, salaryMax: null, currency: "USD", salaryPeriod: "year", publishedAt: "2026-01-01T00:00:00Z" };

describe("email templates", () => {
  it("renders HTML and plain text for every template", async () => {
    const variants = [
      ["alert_confirmation", { email: "person@example.com", confirmationUrl: `${siteUrl}/alerts/confirm?token=x` }],
      ["job_digest", { email: "person@example.com", unsubscribeUrl: `${siteUrl}/alerts/unsubscribe?token=x`, frequency: "weekly", jobs: [job] }],
      ["job_live", { jobId: "job-1", title: "Engineer", slug: "engineer-acme", companyName: "Acme", companySlug: "acme", categoryName: "Engineering", categorySlug: "engineering", expiresAt: "2026-12-31T00:00:00Z" }],
      ["job_expiry", { jobId: "job-1", title: "Engineer", slug: "engineer-acme", companyName: "Acme", companySlug: "acme", expiresAt: "2026-12-31T00:00:00Z" }],
      ["job_pending_review", { jobId: "job-1", title: "Engineer", slug: "engineer-acme", companyName: "Acme", companySlug: "acme", categoryName: "Engineering", categorySlug: "engineering" }],
    ] as const;
    for (const [template, payload] of variants) {
      const value = await renderEmail(template, "person@example.com", payload, siteUrl, `test-${template}`);
      expect(value.html).toContain("<html");
      expect(value.text.length).toBeGreaterThan(20);
      expect(value.idempotencyKey).toBe(`test-${template}`);
    }
  });
});

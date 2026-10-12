import { describe, expect, it } from "vitest";

import { buildJobPostingJsonLd, serializeJsonLd } from "@/lib/seo/job-posting";
import type { SeoJob } from "@/lib/data/seo";

const baseJob: SeoJob = {
  id: "job-1",
  title: "Senior Platform Engineer",
  slug: "senior-platform-engineer-acme",
  description_md: "Build **reliable** systems. <script>alert(1)</script>",
  category_id: "category-1",
  category_name: "Engineering",
  category_slug: "engineering",
  employment_type: "full_time",
  location: "Berlin",
  is_remote: false,
  remote_region: null,
  salary_min: 100000,
  salary_max: 130000,
  currency: "USD",
  salary_period: "year",
  apply_mode: "onsite",
  apply_url: null,
  apply_email: null,
  published_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2026-12-31T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  company_name: "Acme <Systems>",
  company_slug: "acme-systems",
  company_logo_url: "https://example.com/logo.png",
  company_website: "https://example.com",
  company_location: "Berlin",
  tag_slugs: ["typescript"],
};

describe("JobPosting JSON-LD", () => {
  it("includes the required on-site and salary-range fields", () => {
    const value = buildJobPostingJsonLd(baseJob, "https://jobs.example.com");
    expect(value).toMatchObject({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: baseJob.title,
      datePosted: baseJob.published_at,
      validThrough: baseJob.expires_at,
      employmentType: "FULL_TIME",
      directApply: true,
      jobLocation: { address: { addressLocality: "Berlin" } },
      baseSalary: { "@type": "MonetaryAmount", currency: "USD" },
    });
    expect(value.baseSalary?.value).toMatchObject({ minValue: 100000, maxValue: 130000, unitText: "YEAR" });
  });

  it("emits remote requirements and omits baseSalary when absent", () => {
    const value = buildJobPostingJsonLd({ ...baseJob, is_remote: true, location: null, remote_region: "EU", salary_min: null, salary_max: null, apply_mode: "url" }, "https://jobs.example.com");
    expect(value.jobLocation).toBeUndefined();
    expect(value.jobLocationType).toBe("TELECOMMUTE");
    expect(value.applicantLocationRequirements).toMatchObject({ name: "EU" });
    expect(value.baseSalary).toBeUndefined();
    expect(value.directApply).toBeUndefined();
  });

  it("preserves an expired validThrough date in the past", () => {
    const value = buildJobPostingJsonLd({ ...baseJob, expires_at: "2020-01-01T00:00:00.000Z" }, "https://jobs.example.com");
    expect(new Date(value.validThrough).getTime()).toBeLessThan(Date.now());
  });

  it("escapes closing tags when serialized for a script element", () => {
    expect(serializeJsonLd({ value: "</script>" })).not.toContain("</script>");
    expect(serializeJsonLd({ value: "</script>" })).toContain("\\u003c/script>");
  });
});

import type { SeoJob } from "@/lib/data/seo";
import type { JobDetail } from "@/lib/data/jobs";

export type JobPostingJsonLd = {
  "@context": "https://schema.org";
  "@type": "JobPosting";
  title: string;
  description: string;
  datePosted: string;
  validThrough: string;
  hiringOrganization: {
    "@type": "Organization";
    name: string;
    sameAs?: string;
    logo?: string;
  };
  identifier: {
    "@type": "PropertyValue";
    name: string;
    value: string;
  };
  employmentType: string;
  baseSalary?: Record<string, unknown>;
  jobLocation?: Record<string, unknown>;
  jobLocationType?: "TELECOMMUTE";
  applicantLocationRequirements?: Record<string, unknown>;
  directApply?: boolean;
  url: string;
};

const EMPLOYMENT_TYPES: Record<SeoJob["employment_type"], string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
};

const SALARY_UNITS: Record<string, string> = {
  hour: "HOUR",
  day: "DAY",
  month: "MONTH",
  year: "YEAR",
};

function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[`*_>#~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

function buildSalary(job: SeoJob): Record<string, unknown> | undefined {
  if (job.salary_min === null && job.salary_max === null) return undefined;
  const value: Record<string, unknown> = {
    "@type": "QuantitativeValue",
    unitText: SALARY_UNITS[job.salary_period] ?? "YEAR",
  };
  if (job.salary_min !== null) value.minValue = job.salary_min;
  if (job.salary_max !== null) value.maxValue = job.salary_max;
  if (job.salary_min !== null && job.salary_max === null) value.value = job.salary_min;
  if (job.salary_min === null && job.salary_max !== null) value.value = job.salary_max;
  return { "@type": "MonetaryAmount", currency: job.currency, value };
}

function buildLocation(job: SeoJob): Record<string, unknown> | undefined {
  if (job.is_remote) return undefined;
  if (!job.location) return undefined;
  return {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: job.location,
    },
  };
}

export function buildJobPostingJsonLd(job: SeoJob, siteUrl: string): JobPostingJsonLd {
  const organization: JobPostingJsonLd["hiringOrganization"] = {
    "@type": "Organization",
    name: job.company_name,
  };
  if (job.company_website) organization.sameAs = job.company_website;
  if (job.company_logo_url) organization.logo = job.company_logo_url;

  const result: JobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: plainText(job.description_md),
    datePosted: job.published_at,
    validThrough: job.expires_at,
    hiringOrganization: organization,
    identifier: {
      "@type": "PropertyValue",
      name: job.company_name,
      value: job.id,
    },
    employmentType: EMPLOYMENT_TYPES[job.employment_type],
    url: new URL(`/jobs/${job.slug}`, siteUrl).toString(),
  };

  const salary = buildSalary(job);
  if (salary) result.baseSalary = salary;
  const location = buildLocation(job);
  if (location) result.jobLocation = location;
  if (job.is_remote) {
    result.jobLocationType = "TELECOMMUTE";
    if (job.remote_region) {
      result.applicantLocationRequirements = {
        "@type": "Country",
        name: job.remote_region,
      };
    }
  }
  if (job.apply_mode === "onsite") result.directApply = true;
  return result;
}

/** Build the same schema for the detail RPC, including expired listings. */
export function buildJobPostingJsonLdFromDetail(job: JobDetail, siteUrl: string): JobPostingJsonLd {
  return buildJobPostingJsonLd(
    {
      id: job.id,
      title: job.title,
      slug: job.slug,
      description_md: job.descriptionMd,
      category_id: job.categoryId,
      category_name: job.categoryName,
      category_slug: job.categorySlug,
      employment_type: job.employmentType,
      location: job.location,
      is_remote: job.isRemote,
      remote_region: job.remoteRegion,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      currency: job.currency,
      salary_period: job.salaryPeriod,
      apply_mode: job.applyMode,
      apply_url: job.applyUrl,
      apply_email: job.applyEmail,
      published_at: job.publishedAt,
      expires_at: job.expiresAt,
      updated_at: job.updatedAt,
      company_name: job.company.name,
      company_slug: job.company.slug,
      company_logo_url: job.company.logoUrl,
      company_website: job.companyWebsite,
      company_location: job.companyLocation,
      tag_slugs: job.tags,
    },
    siteUrl,
  );
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

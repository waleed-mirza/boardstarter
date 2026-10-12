import type { JobListItem } from "@/lib/data/jobs";

const employmentLabels: Record<JobListItem["employmentType"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
};

export function formatEmploymentType(value: JobListItem["employmentType"]): string {
  return employmentLabels[value];
}

export function formatSalary(job: Pick<JobListItem, "salaryMin" | "salaryMax" | "currency" | "salaryPeriod">): string | null {
  if (job.salaryMin === null && job.salaryMax === null) return null;
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: job.currency,
    maximumFractionDigits: 0,
  });
  const period = job.salaryPeriod === "year" ? "yr" : job.salaryPeriod;
  if (job.salaryMin !== null && job.salaryMax !== null) {
    return `${formatter.format(job.salaryMin)}–${formatter.format(job.salaryMax)} / ${period}`;
  }
  const amount = job.salaryMin ?? job.salaryMax;
  return amount === null ? null : `${formatter.format(amount)} / ${period}`;
}

export function formatRelativeDate(value: string, now = new Date().toISOString()): string {
  const delta = new Date(now).getTime() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(delta / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

export function getApplyHref(job: Pick<JobListItem, "slug"> & { applyMode?: "url" | "email" | "onsite"; applyUrl?: string | null; applyEmail?: string | null }): string {
  if (job.applyMode === "email" && job.applyEmail) return `mailto:${job.applyEmail}`;
  if (job.applyMode === "url" && job.applyUrl) return job.applyUrl;
  return `/jobs/${job.slug}#apply`;
}

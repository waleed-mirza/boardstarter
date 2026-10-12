import Link from "next/link";
import { XIcon } from "lucide-react";

import type { JobFilters } from "@/lib/jobs/filters";
import { buildJobSearchParams } from "@/lib/jobs/filters";
import { formatEmploymentType } from "@/lib/jobs/format";

function chipHref(filters: JobFilters, remove: (next: JobFilters) => JobFilters): string {
  const params = buildJobSearchParams(remove(filters), 1);
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

export function ActiveFilterChips({ filters }: { filters: JobFilters }) {
  const chips: { label: string; href: string }[] = [];
  if (filters.query) {
    chips.push({ label: `Search: ${filters.query}`, href: chipHref(filters, (next) => ({ ...next, query: undefined })) });
  }
  for (const category of filters.categories ?? []) {
    chips.push({
      label: category,
      href: chipHref(filters, (next) => ({ ...next, categories: next.categories?.filter((value) => value !== category) })),
    });
  }
  for (const type of filters.employmentTypes ?? []) {
    chips.push({
      label: formatEmploymentType(type),
      href: chipHref(filters, (next) => ({ ...next, employmentTypes: next.employmentTypes?.filter((value) => value !== type) })),
    });
  }
  if (filters.remote !== undefined) {
    chips.push({ label: filters.remote ? "Remote" : "On-site", href: chipHref(filters, (next) => ({ ...next, remote: undefined })) });
  }
  if (filters.location) chips.push({ label: filters.location, href: chipHref(filters, (next) => ({ ...next, location: undefined })) });
  if (filters.salaryBand) chips.push({ label: filters.salaryBand, href: chipHref(filters, (next) => ({ ...next, salaryBand: undefined })) });
  for (const tag of filters.tags ?? []) {
    chips.push({
      label: tag,
      href: chipHref(filters, (next) => ({ ...next, tags: next.tags?.filter((value) => value !== tag) })),
    });
  }
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <Link key={`${chip.label}-${chip.href}`} href={chip.href} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-bg-muted px-2.5 text-xs text-fg-muted hover:text-fg focus-ring">
          {chip.label}
          <XIcon className="size-3" aria-hidden />
          <span className="sr-only">Remove {chip.label}</span>
        </Link>
      ))}
    </div>
  );
}

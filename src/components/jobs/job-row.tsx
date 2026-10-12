import Link from "next/link";
import { ArrowUpRightIcon, MapPinIcon } from "lucide-react";

import { CompanyLogo } from "@/components/jobs/company-logo";
import { Badge } from "@/components/ui/badge";
import { formatEmploymentType, formatRelativeDate, formatSalary } from "@/lib/jobs/format";
import type { JobListItem } from "@/lib/data/jobs";
import { cn } from "@/lib/utils";

export function JobRow({
  job,
  asOf,
  className,
  preview = false,
}: {
  job: JobListItem;
  asOf?: string;
  className?: string;
  preview?: boolean;
}) {
  const salary = formatSalary(job);
  const location = job.isRemote ? `Remote${job.remoteRegion ? ` · ${job.remoteRegion}` : ""}` : job.location;
  const content = (
    <>
      <CompanyLogo name={job.company.name} src={job.company.logoUrl} size={40} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-lg font-semibold tracking-tight group-hover:underline">
            {job.title}
          </span>
          {job.isFeatured ? (
            <Badge variant="outline" className="hidden border-accent text-accent-text sm:inline-flex">
              Featured
            </Badge>
          ) : null}
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-fg-muted">
          <span className="truncate">{job.company.name}</span>
          <span aria-hidden>·</span>
          {location ? (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPinIcon className="size-3" aria-hidden />
              {location}
            </span>
          ) : null}
          {location ? <span aria-hidden>·</span> : null}
          <span>{formatEmploymentType(job.employmentType)}</span>
          {salary ? (
            <>
              <span aria-hidden>·</span>
              <span>{salary}</span>
            </>
          ) : null}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-fg-subtle">
        <time dateTime={job.publishedAt}>{formatRelativeDate(job.publishedAt, asOf)}</time>
        {!preview ? <ArrowUpRightIcon className="size-4 opacity-0 transition-opacity duration-120 group-hover:opacity-100" aria-hidden /> : null}
      </span>
    </>
  );
  const classes = cn(
    "group flex min-h-24 items-center gap-3 border-b border-border px-4 transition-colors duration-120 hover:bg-bg-muted focus-visible:bg-bg-muted focus-ring md:h-18 md:min-h-18 md:gap-4",
    job.isFeatured && "border-l-2 border-l-accent",
    className,
  );
  if (preview) {
    return <div data-testid="job-row" className={classes}>{content}</div>;
  }
  return (
    <Link
      href={`/jobs/${job.slug}`}
      data-testid="job-row"
      className={classes}
    >
      {content}
    </Link>
  );
}

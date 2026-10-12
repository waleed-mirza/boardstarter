import { BriefcaseBusinessIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/patterns/empty-state";
import { JobRow } from "@/components/jobs/job-row";
import { ListSkeleton } from "@/components/patterns/skeletons";
import type { JobListItem } from "@/lib/data/jobs";

export function JobList({
  jobs,
  asOf,
  emptyTitle = "No jobs match these filters",
  emptyDescription = "Try removing a filter or searching for a broader term.",
}: {
  jobs: JobListItem[];
  asOf?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={BriefcaseBusinessIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={<Link href="/jobs" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-bg-muted focus-ring">Clear filters</Link>}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg" data-testid="job-list">
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} asOf={asOf} />
      ))}
    </div>
  );
}

export function JobListLoading({ rows = 8 }: { rows?: number }) {
  return <ListSkeleton rows={rows} />;
}

import { ExternalLinkIcon, MailIcon } from "lucide-react";

import { TrackedApplyLink } from "@/components/jobs/job-tracking";
import { ApplicationForm } from "@/components/jobs/application-form";
import { Button } from "@/components/ui/button";
import { formatSalary, getApplyHref } from "@/lib/jobs/format";
import type { JobDetail } from "@/lib/data/jobs";

export function ApplyCard({ job, anchorId = "apply", preview = false }: { job: JobDetail; anchorId?: string; preview?: boolean }) {
  const salary = formatSalary(job);
  if (job.isExpired) {
    return (
      <aside id={anchorId} className="rounded-lg border border-border bg-bg-muted p-5">
        <p className="text-sm font-medium">This job is no longer accepting applications.</p>
        <p className="mt-2 text-sm text-fg-muted">Browse similar live jobs below.</p>
      </aside>
    );
  }
  const href = getApplyHref(job);
  const isExternal = job.applyMode === "url";
  if (job.applyMode === "onsite") {
    return (
      <aside id={anchorId} className="sticky top-20 rounded-lg border border-border bg-bg p-5">
        <div className="text-sm">
          <p className="text-lg font-semibold">Apply for this role</p>
          <p className="mt-2 text-fg-muted">Send a short introduction and the team will follow up.</p>
          {preview ? <p className="mt-4 text-fg-muted">Application form appears on the live listing.</p> : <ApplicationForm jobId={job.id} />}
        </div>
      </aside>
    );
  }
  return (
    <aside id={anchorId} className="sticky top-20 rounded-lg border border-border bg-bg p-5">
      <div className="flex flex-col gap-3 text-sm">
        {salary ? <p className="text-lg font-semibold">{salary}</p> : <p className="text-sm text-fg-muted">Salary not listed</p>}
        <dl className="flex flex-col gap-2 text-fg-muted">
          <div className="flex justify-between gap-3"><dt>Type</dt><dd className="text-right text-fg">{job.employmentType.replace("_", "-")}</dd></div>
          <div className="flex justify-between gap-3"><dt>Location</dt><dd className="text-right text-fg">{job.isRemote ? "Remote" : job.location ?? "Not specified"}</dd></div>
          <div className="flex justify-between gap-3"><dt>Posted</dt><dd className="text-right text-fg"><time dateTime={job.publishedAt}>{new Date(job.publishedAt).toLocaleDateString()}</time></dd></div>
        </dl>
        {preview ? (
          <Button type="button" disabled className="mt-2 min-h-11 w-full">
            {job.applyMode === "email" ? <MailIcon aria-hidden /> : <ExternalLinkIcon aria-hidden />}
            Apply now
          </Button>
        ) : (
          <Button asChild className="mt-2 min-h-11 w-full">
            <TrackedApplyLink
              jobId={job.id}
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer" : undefined}
            >
              {job.applyMode === "email" ? <MailIcon aria-hidden /> : <ExternalLinkIcon aria-hidden />}
              Apply now
            </TrackedApplyLink>
          </Button>
        )}
      </div>
    </aside>
  );
}

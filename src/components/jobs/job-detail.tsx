import Link from "next/link";
import { ArrowLeftIcon, Building2Icon, MapPinIcon } from "lucide-react";

import { ApplyCard } from "@/components/jobs/apply-card";
import { CompanyLogo } from "@/components/jobs/company-logo";
import { JobMarkdown } from "@/components/jobs/job-markdown";
import { JobRow } from "@/components/jobs/job-row";
import { JobViewTracker } from "@/components/jobs/job-tracking";
import { Badge } from "@/components/ui/badge";
import type { JobDetail, JobListItem } from "@/lib/data/jobs";
import { formatEmploymentType, formatRelativeDate } from "@/lib/jobs/format";

export function JobDetailView({ job, moreJobs, mode = "public" }: { job: JobDetail; moreJobs: JobListItem[]; mode?: "public" | "preview" }) {
  const preview = mode === "preview";
  const Wrapper = preview ? "div" : "main";
  return (
    <Wrapper className="container-page py-8 pb-24 md:py-12">
      {!preview ? <JobViewTracker jobId={job.id} enabled={!job.isExpired} /> : null}
      {preview ? (
        <span className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-fg-muted"><ArrowLeftIcon className="size-4" aria-hidden /> Browse jobs</span>
      ) : (
        <Link href="/jobs" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-fg-muted hover:text-fg focus-ring">
          <ArrowLeftIcon className="size-4" aria-hidden /> Browse jobs
        </Link>
      )}
      {job.isExpired ? (
        <div role="status" className="mb-6 border-l-2 border-warning bg-warning/10 px-4 py-3 text-sm text-fg">
          This listing has expired. The details remain available for reference; try a similar live role below.
        </div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_var(--container-apply)] lg:gap-12">
        <article className="min-w-0">
          <header className="border-b border-border pb-8">
            <div className="flex items-start gap-4">
              <CompanyLogo name={job.company.name} src={job.company.logoUrl} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {job.isFeatured && !job.isExpired ? <Badge className="bg-accent text-accent-fg">Featured</Badge> : null}
                  {preview ? <span className="text-sm text-accent-text">{job.company.name}</span> : <Link href={`/companies/${job.company.slug}`} className="text-sm text-accent-text hover:underline focus-ring">{job.company.name}</Link>}
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{job.title}</h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
                  <span className="inline-flex items-center gap-1"><MapPinIcon className="size-4" aria-hidden />{job.isRemote ? `Remote${job.remoteRegion ? ` · ${job.remoteRegion}` : ""}` : job.location ?? "Location not specified"}</span>
                  <span aria-hidden>·</span>
                  <span>{formatEmploymentType(job.employmentType)}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={job.publishedAt}>{formatRelativeDate(job.publishedAt, job.asOf)}</time>
                </p>
              </div>
            </div>
          </header>
          <div className="mt-8">
            <JobMarkdown source={job.descriptionMd} />
            {job.tags.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2" aria-label="Job tags">
                {job.tags.map((tag) => preview ? <Badge key={tag} variant="outline" className="min-h-8">{tag}</Badge> : <Link key={tag} href={`/tags/${tag}`}><Badge variant="outline" className="min-h-8 hover:bg-bg-muted">{tag}</Badge></Link>)}
              </div>
            ) : null}
          </div>
          {moreJobs.length > 0 ? (
            <section className="mt-12 border-t border-border pt-8">
              <h2 className="text-xl font-semibold tracking-tight">More jobs at {job.company.name}</h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-border"><>{moreJobs.map((item) => <JobRow key={item.id} job={item} asOf={job.asOf} />)}</></div>
            </section>
          ) : null}
        </article>
        <div className="hidden lg:order-last lg:block">
          <ApplyCard job={job} preview={preview} />
          <div className="mt-4 hidden rounded-lg border border-border p-4 text-sm text-fg-muted lg:block">
            <p className="font-medium text-fg">{job.company.name}</p>
            <p className="mt-2 flex items-start gap-2"><Building2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />{job.companyLocation ?? "Distributed team"}</p>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-4 bottom-4 z-30 lg:hidden"><ApplyCard job={job} anchorId="apply-mobile" preview={preview} /></div>
    </Wrapper>
  );
}

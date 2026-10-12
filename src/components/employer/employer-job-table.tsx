"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { DataTable, type DataTableColumn } from "@/components/patterns/data-table";
import { StatusPill, type JobStatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { closeJob } from "@/lib/actions/jobs";
import type { EmployerJob } from "@/lib/data/jobs";
type JobBucket = "active" | "closed";

function statusPill(status: EmployerJob["status"]): JobStatusPill {
  if (status === "published") return "live";
  if (status === "pending_review") return "pending";
  if (status === "expired") return "expired";
  if (status === "rejected") return "rejected";
  return "draft";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

function canView(job: EmployerJob): boolean {
  return job.status === "published" || job.status === "expired";
}

function JobActions({ job, onClose }: { job: EmployerJob; onClose: (job: EmployerJob) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${job.title}`}
        >
          <MoreHorizontalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/jobs/${job.id}/edit`}>
            <PencilIcon aria-hidden />
            Edit
          </Link>
        </DropdownMenuItem>
        {canView(job) ? (
          <DropdownMenuItem asChild>
            <Link href={`/jobs/${job.slug}`}>
              <EyeIcon aria-hidden />
              View listing
            </Link>
          </DropdownMenuItem>
        ) : null}
        {job.status !== "expired" ? (
          <DropdownMenuItem onSelect={() => onClose(job)} className="text-danger focus:text-danger">
            <XCircleIcon aria-hidden />
            Close job
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/jobs/${job.id}/checkout`}>
            <RefreshCwIcon aria-hidden />
            {job.status === "expired" ? "Renew listing" : "Pay / renew"}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileJobCard({
  job,
  onClose,
}: {
  job: EmployerJob;
  onClose: (job: EmployerJob) => void;
}) {
  return (
    <article className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{job.title}</h3>
          <p className="mt-1 text-xs text-fg-muted">Updated {formatDate(job.updated_at)}</p>
        </div>
        <JobActions job={job} onClose={onClose} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
        <StatusPill status={statusPill(job.status)} />
        <span>
          <span className="font-medium text-fg tabular">{job.views}</span> views
        </span>
        <span>
          <span className="font-medium text-fg tabular">{job.applicationsCount}</span> applications
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
        <div>
          <dt className="text-fg-subtle">Posted</dt>
          <dd className="mt-1">{formatDate(job.published_at)}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Expires</dt>
          <dd className="mt-1">{formatDate(job.expires_at)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function EmployerJobTable({ jobs }: { jobs: readonly EmployerJob[] }) {
  const router = useRouter();
  const [bucket, setBucket] = useState<JobBucket>("active");
  const [closingJob, setClosingJob] = useState<EmployerJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeJobs = useMemo(() => jobs.filter((job) => job.status !== "expired"), [jobs]);
  const closedJobs = useMemo(() => jobs.filter((job) => job.status === "expired"), [jobs]);

  function requestClose(job: EmployerJob) {
    setError(null);
    setClosingJob(job);
  }

  function confirmClose() {
    if (!closingJob) return;
    const job = closingJob;
    startTransition(async () => {
      const result = await closeJob(job.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClosingJob(null);
      router.refresh();
    });
  }

  const columns: DataTableColumn<EmployerJob>[] = [
    {
      key: "title",
      header: "Job",
      value: (job) => job.title,
      className: "min-w-56",
      cell: (job) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{job.title}</p>
          <p className="mt-1 text-xs text-fg-muted">Updated {formatDate(job.updated_at)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      value: (job) => job.status,
      cell: (job) => <StatusPill status={statusPill(job.status)} />,
    },
    {
      key: "views",
      header: "Views",
      value: (job) => job.views,
      align: "right",
      cell: (job) => <span className="tabular">{job.views}</span>,
    },
    {
      key: "applications",
      header: "Applications",
      value: (job) => job.applicationsCount,
      align: "right",
      cell: (job) => <span className="tabular">{job.applicationsCount}</span>,
    },
    {
      key: "posted",
      header: "Posted",
      value: (job) => job.published_at ?? "",
      cell: (job) => formatDate(job.published_at),
    },
    {
      key: "expires",
      header: "Expires",
      value: (job) => job.expires_at ?? "",
      cell: (job) => formatDate(job.expires_at),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (job) => <JobActions job={job} onClose={requestClose} />,
    },
  ];

  function renderTable(rows: readonly EmployerJob[], bucketName: JobBucket) {
    return (
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(job) => job.id}
        initialSort={{ key: "title", dir: "asc" }}
        mobileRow={(job) => <MobileJobCard job={job} onClose={requestClose} />}
        empty={
          <Card className="rounded-none border-0 shadow-none ring-0">
            <CardHeader>
              <CardTitle>{bucketName === "closed" ? "No closed jobs" : "No active jobs"}</CardTitle>
              <CardDescription>
                {bucketName === "closed"
                  ? "Jobs you close will stay here for reference."
                  : "Post a job to start building your candidate pipeline."}
              </CardDescription>
            </CardHeader>
            {bucketName === "active" ? (
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard/post">
                    <PlusIcon aria-hidden />
                    Post a Job
                  </Link>
                </Button>
              </CardContent>
            ) : null}
          </Card>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={bucket} onValueChange={(value) => setBucket(value as JobBucket)}>
        <TabsList aria-label="Job status filter">
          <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedJobs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          {renderTable(activeJobs, "active")}
        </TabsContent>
        <TabsContent value="closed" className="mt-4">
          {renderTable(closedJobs, "closed")}
        </TabsContent>
      </Tabs>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Dialog
        open={Boolean(closingJob)}
        onOpenChange={(open) => {
          if (!open && !pending) setClosingJob(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this job?</DialogTitle>
            <DialogDescription>
              “{closingJob?.title}” will leave your active list and become expired. Its public URL
              stays available for reference.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Keep open
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirmClose}>
              {pending ? "Closing…" : "Close job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

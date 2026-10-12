"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/patterns/data-table";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatusPill, type JobStatusPill } from "@/components/patterns/status-pill";
import {
  approveJob,
  deleteJob,
  extendJob,
  forceExpireJob,
  rejectJob,
  setJobFeatured,
} from "@/lib/actions/admin/jobs";
import { deletePackage, savePackage } from "@/lib/actions/admin/packages";
import {
  deleteCategory,
  deleteTag,
  mergeCategory,
  mergeTag,
  saveCategory,
  saveTag,
} from "@/lib/actions/admin/taxonomy";
import { updateSiteSettings } from "@/lib/actions/admin/settings";
import type { ActionResult } from "@/lib/actions/result";
import type { AdminAction } from "@/lib/data/admin/audit";
import type { AdminJob } from "@/lib/data/admin/jobs";
import type { AdminPackage } from "@/lib/data/admin/packages";
import type { AdminCategory, AdminTag } from "@/lib/data/admin/taxonomy";
import type { AdminStats } from "@/lib/data/admin/stats";
import type { AdminSubscriber } from "@/lib/data/admin/subscribers";
import type { Paginated } from "@/lib/data/types";
import type { PublicSiteConfig } from "@/lib/data/settings";
import type {
  CategoryInput,
  PackageInput,
  SiteSettingsInput,
  TagInput,
} from "@/lib/validation/admin";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(cents / 100);
}

function statusPill(status: AdminJob["status"]): JobStatusPill {
  if (status === "published") return "live";
  if (status === "pending_review") return "pending";
  return status;
}

function MutationButton({
  label,
  pendingLabel = "Working…",
  run,
  variant = "outline",
  size = "sm",
  onComplete,
}: {
  label: string;
  pendingLabel?: string;
  run: () => Promise<ActionResult<Record<string, unknown>>>;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "xs" | "sm" | "default";
  onComplete?: (result: ActionResult<Record<string, unknown>>) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await run();
            if (!result.ok) setError(result.error);
            onComplete?.(result);
            if (result.ok) router.refresh();
          });
        }}
      >
        {pending ? pendingLabel : label}
      </Button>
      {error ? <span className="max-w-44 text-right text-xs text-danger">{error}</span> : null}
    </span>
  );
}

function RejectJobButton({ job }: { job: AdminJob }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <>
      <Button type="button" size="sm" variant="destructive" onClick={() => setOpen(true)}>
        <XIcon aria-hidden /> Reject
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject “{job.title}”</DialogTitle>
            <DialogDescription>
              Give the employer a useful reason. The listing will remain hidden until it is edited
              and resubmitted.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`reject-reason-${job.id}`}>Reason</Label>
            <Textarea
              id={`reject-reason-${job.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Tell the employer what needs to change…"
              rows={4}
              autoFocus
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || reason.trim().length < 3}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await rejectJob(job.id, reason);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setOpen(false);
                  setReason("");
                  router.refresh();
                });
              }}
            >
              {pending ? "Rejecting…" : "Reject listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExtendJobButton({ job }: { job: AdminJob }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("30");
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Extend
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend “{job.title}”</DialogTitle>
            <DialogDescription>
              Choose how many days to add to the listing’s paid period.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`extend-days-${job.id}`}>Days</Label>
            <Input
              id={`extend-days-${job.id}`}
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <MutationButton
              label="Extend listing"
              run={() => extendJob(job.id, Number(days))}
              onComplete={(result) => {
                if (result.ok) setOpen(false);
              }}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function JobActions({ job, queue = false }: { job: AdminJob; queue?: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {queue ? (
        <>
          <MutationButton label="Approve" variant="default" run={() => approveJob(job.id)} />
          <RejectJobButton job={job} />
        </>
      ) : null}
      {job.status === "published" ? (
        <MutationButton
          label={job.is_featured ? "Unfeature" : "Feature"}
          variant="outline"
          run={() => setJobFeatured(job.id, !job.is_featured)}
        />
      ) : null}
      {job.status === "published" ? <ExtendJobButton job={job} /> : null}
      {job.status !== "expired" ? (
        <MutationButton
          label="Force expire"
          variant="outline"
          run={() => {
            if (!window.confirm(`Force-expire “${job.title}”?`))
              return Promise.resolve({ ok: false, error: "Cancelled." });
            return forceExpireJob(job.id);
          }}
        />
      ) : null}
      <MutationButton
        label="Delete"
        variant="destructive"
        run={() => {
          if (!window.confirm(`Delete “${job.title}”? This cannot be undone.`))
            return Promise.resolve({ ok: false, error: "Cancelled." });
          return deleteJob(job.id);
        }}
      />
    </div>
  );
}

function JobMeta({ job }: { job: AdminJob }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
      <span>{job.company.name}</span>
      <span aria-hidden>·</span>
      <span>{job.category.name}</span>
      <span aria-hidden>·</span>
      <span>Created {formatDate(job.created_at)}</span>
    </div>
  );
}

export function ReviewQueue({ jobs }: { jobs: AdminJob[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={CheckIcon}
        title="Queue is clear."
        description="New paid listings waiting for review will appear here."
      />
    );
  }
  return (
    <div className="grid gap-3">
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-medium">{job.title}</h2>
                <StatusPill status="pending" />
              </div>
              <JobMeta job={job} />
              <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{job.description_md}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-fg-subtle">
                <span>
                  {job.ordersCount} paid order{job.ordersCount === 1 ? "" : "s"}
                </span>
                <span>
                  {job.applicationsCount} application{job.applicationsCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link href={`/admin/jobs/${job.id}/preview`} target="_blank">
                  <EyeIcon aria-hidden /> Preview
                </Link>
              </Button>
              <JobActions job={job} queue />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const cards = [
    {
      label: "Live jobs",
      value: stats.jobsByStatus.published,
      detail: `${stats.jobsByStatus.pending_review} awaiting review`,
    },
    {
      label: "Pending review",
      value: stats.jobsByStatus.pending_review,
      detail: `${stats.jobsByStatus.rejected} rejected`,
    },
    { label: "Subscribers", value: stats.subscriberCount, detail: "alert subscribers" },
    ...stats.revenueByCurrency.map((item) => ({
      label: `Revenue (${item.currency})`,
      value: formatMoney(item.amountCents, item.currency),
      detail: "paid orders",
    })),
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} size="sm">
          <CardContent className="p-4">
            <p className="text-xs text-fg-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs text-fg-subtle">{card.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TopCategories({ stats }: { stats: AdminStats }) {
  if (stats.topCategories.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top categories</CardTitle>
        <CardDescription>Jobs by category across the board.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {stats.topCategories.map((category) => (
          <div key={category.name} className="flex items-center justify-between text-sm">
            <span>{category.name}</span>
            <span className="text-fg-muted tabular-nums">{category.count}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function JobsTable({
  jobs,
  total,
  page,
  hasNext,
  query,
  status,
}: {
  jobs: AdminJob[];
  total: number;
  page: number;
  hasNext: boolean;
  query: string;
  status: string;
}) {
  const pageHref = (nextPage: number) =>
    `/admin/jobs?query=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${nextPage}`;
  return (
    <>
      <DataTable
        rows={jobs}
        getRowKey={(job) => job.id}
        initialSort={{ key: "created", dir: "desc" }}
        columns={[
          {
            key: "title",
            header: "Listing",
            value: (job) => job.title,
            cell: (job) => (
              <div className="min-w-52">
                <div className="flex items-center gap-2 font-medium">
                  <Link href={`/jobs/${job.slug}`} className="hover:underline" target="_blank">
                    {job.title}
                  </Link>
                  {job.is_featured ? (
                    <StarIcon className="size-3.5 fill-current text-accent" aria-label="Featured" />
                  ) : null}
                </div>
                <JobMeta job={job} />
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
            key: "expires",
            header: "Expires",
            value: (job) => job.expires_at ?? "",
            cell: (job) => <span className="text-fg-muted">{formatDate(job.expires_at)}</span>,
          },
          {
            key: "orders",
            header: "Orders",
            align: "right",
            value: (job) => job.ordersCount,
            cell: (job) => <span className="tabular-nums">{job.ordersCount}</span>,
          },
          {
            key: "actions",
            header: "Actions",
            align: "right",
            cell: (job) => <JobActions job={job} />,
          },
        ]}
        empty={
          <EmptyState
            icon={MoreHorizontalIcon}
            title="No jobs match these filters."
            description="Try a different status or search phrase."
          />
        }
      />
      <div className="flex items-center justify-between gap-3 pt-4 text-sm text-fg-muted">
        <span>
          {total} listing{total === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild size="sm" variant="outline">
              <Link href={pageHref(page - 1)}>Previous</Link>
            </Button>
          ) : null}
          {hasNext ? (
            <Button asChild size="sm" variant="outline">
              <Link href={pageHref(page + 1)}>Next</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function JobFilters({ query, status }: { query: string; status: string }) {
  return (
    <form action="/admin/jobs" method="get" className="flex flex-wrap items-end gap-2">
      <div className="grid min-w-52 gap-1.5">
        <Label htmlFor="job-search">Search</Label>
        <Input id="job-search" name="query" defaultValue={query} placeholder="Title or slug" />
      </div>
      <div className="grid min-w-44 gap-1.5">
        <Label htmlFor="job-status">Status</Label>
        <Select name="status" defaultValue={status}>
          <SelectTrigger id="job-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="outline">
        Filter
      </Button>
    </form>
  );
}

type PackageDraft = Omit<PackageInput, "id"> & { id: string | null };

const emptyPackage: PackageDraft = {
  id: null,
  name: "",
  priceCents: 0,
  currency: "USD",
  durationDays: 30,
  isFeatured: false,
  lsVariantId: "",
  isActive: true,
  sort: 0,
};

function packageDraft(item: AdminPackage): PackageDraft {
  return {
    id: item.id,
    name: item.name,
    priceCents: item.price_cents,
    currency: item.currency,
    durationDays: item.duration_days,
    isFeatured: item.is_featured,
    lsVariantId: item.ls_variant_id,
    isActive: item.is_active,
    sort: item.sort,
  };
}

export function PackagesManager({ packages }: { packages: AdminPackage[] }) {
  const [draft, setDraft] = useState<PackageDraft>(emptyPackage);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const update = <K extends keyof PackageDraft>(key: K, value: PackageDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await savePackage(draft);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Package saved.");
      setDraft(emptyPackage);
      router.refresh();
    });
  };
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <DataTable
        rows={packages}
        getRowKey={(item) => item.id}
        columns={[
          {
            key: "name",
            header: "Package",
            value: (item) => item.name,
            cell: (item) => (
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-fg-muted">
                  {item.duration_days} days · {item.ls_variant_id}
                </p>
              </div>
            ),
          },
          {
            key: "price",
            header: "Price",
            value: (item) => item.price_cents,
            cell: (item) => (
              <span className="tabular-nums">{formatMoney(item.price_cents, item.currency)}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            value: (item) => (item.is_active ? "active" : "inactive"),
            cell: (item) => (
              <span className={item.is_active ? "text-success" : "text-fg-muted"}>
                {item.is_active ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            key: "usage",
            header: "Usage",
            align: "right",
            value: (item) => item.jobsCount + item.ordersCount,
            cell: (item) => (
              <div className="text-right">
                <span className="tabular-nums">
                  {item.jobsCount} jobs · {item.ordersCount} orders
                </span>
                {item.jobsCount > 0 || item.ordersCount > 0 ? (
                  <span className="block text-xs text-warning">In use — deactivate instead</span>
                ) : null}
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            align: "right",
            cell: (item) => (
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Edit ${item.name}`}
                  onClick={() => setDraft(packageDraft(item))}
                >
                  <PencilIcon aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Delete ${item.name}`}
                  disabled={item.jobsCount > 0 || item.ordersCount > 0}
                  onClick={() => {
                    if (window.confirm(`Delete package “${item.name}”?`))
                      startTransition(async () => {
                        const result = await deletePackage(item.id);
                        setMessage(result.ok ? "Package deleted." : result.error);
                        if (result.ok) router.refresh();
                      });
                  }}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              </div>
            ),
          },
        ]}
        empty={
          <EmptyState
            icon={PlusIcon}
            title="No packages yet."
            description="Create the first paid listing package."
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Edit package" : "New package"}</CardTitle>
          <CardDescription>
            Prices are stored in cents and the variant ID must match your Lemon Squeezy product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={submit}>
            <div className="grid gap-1.5">
              <Label htmlFor="package-name">Name</Label>
              <Input
                id="package-name"
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="package-price">Price (cents)</Label>
                <Input
                  id="package-price"
                  type="number"
                  min={0}
                  value={draft.priceCents}
                  onChange={(event) => update("priceCents", Number(event.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="package-currency">Currency</Label>
                <Input
                  id="package-currency"
                  maxLength={3}
                  value={draft.currency}
                  onChange={(event) => update("currency", event.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="package-duration">Duration (days)</Label>
                <Input
                  id="package-duration"
                  type="number"
                  min={1}
                  value={draft.durationDays}
                  onChange={(event) => update("durationDays", Number(event.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="package-sort">Sort</Label>
                <Input
                  id="package-sort"
                  type="number"
                  min={0}
                  value={draft.sort}
                  onChange={(event) => update("sort", Number(event.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="package-variant">Lemon Squeezy variant ID</Label>
              <Input
                id="package-variant"
                value={draft.lsVariantId}
                onChange={(event) => update("lsVariantId", event.target.value)}
                required
              />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Featured package</span>
              <Switch
                checked={draft.isFeatured}
                onCheckedChange={(value) => update("isFeatured", value)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Active</span>
              <Switch
                checked={draft.isActive}
                onCheckedChange={(value) => update("isActive", value)}
              />
            </label>
            {message ? <p className="text-sm text-fg-muted">{message}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                <SaveIcon aria-hidden /> {pending ? "Saving…" : "Save package"}
              </Button>
              {draft.id ? (
                <Button type="button" variant="ghost" onClick={() => setDraft(emptyPackage)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function TaxonomyManager({
  categories,
  tags,
}: {
  categories: AdminCategory[];
  tags: AdminTag[];
}) {
  const [categoryDraft, setCategoryDraft] = useState<CategoryInput>({
    id: null,
    name: "",
    slug: "",
    description: null,
    sort: 0,
  });
  const [tagDraft, setTagDraft] = useState<TagInput>({ id: null, name: "", slug: "" });
  const [categoryTargets, setCategoryTargets] = useState<Record<string, string>>({});
  const [tagTargets, setTagTargets] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const run = (action: () => Promise<ActionResult<Record<string, unknown>>>, success: string) =>
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? success : result.error);
      if (result.ok) router.refresh();
    });
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Jobs can be reassigned before a category is removed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            {categories.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-fg-muted">
                      /{item.slug} · {item.jobsCount} jobs
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit ${item.name}`}
                    onClick={() =>
                      setCategoryDraft({
                        id: item.id,
                        name: item.name,
                        slug: item.slug,
                        description: item.description,
                        sort: item.sort,
                      })
                    }
                  >
                    <PencilIcon aria-hidden />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Select
                    value={categoryTargets[item.id] ?? ""}
                    onValueChange={(value) =>
                      setCategoryTargets((current) => ({ ...current, [item.id]: value }))
                    }
                  >
                    <SelectTrigger className="min-w-48">
                      <SelectValue placeholder="Reassign / merge into…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((target) => target.id !== item.id)
                        .map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!categoryTargets[item.id] || pending}
                    onClick={() => {
                      const target = categoryTargets[item.id];
                      if (target) run(() => mergeCategory(item.id, target), "Category merged.");
                    }}
                  >
                    Merge
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      const target = categoryTargets[item.id] || null;
                      const suffix = target
                        ? ` and reassign its jobs to “${categories.find((category) => category.id === target)?.name ?? "the selected category"}”`
                        : "";
                      if (window.confirm(`Delete category “${item.name}”${suffix}?`))
                        run(() => deleteCategory(item.id, target), "Category deleted.");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <form
            className="grid gap-2 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => saveCategory(categoryDraft), "Category saved.");
              setCategoryDraft({ id: null, name: "", slug: "", description: null, sort: 0 });
            }}
          >
            <p className="text-sm font-medium">
              {categoryDraft.id ? "Edit category" : "New category"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Category name"
                placeholder="Name"
                value={categoryDraft.name}
                onChange={(event) =>
                  setCategoryDraft((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: current.id ? current.slug : slugify(event.target.value),
                  }))
                }
                required
              />
              <Input
                aria-label="Category slug"
                placeholder="slug"
                value={categoryDraft.slug}
                onChange={(event) =>
                  setCategoryDraft((current) => ({ ...current, slug: slugify(event.target.value) }))
                }
                required
              />
            </div>
            <Textarea
              aria-label="Category description"
              placeholder="Description (optional)"
              value={categoryDraft.description ?? ""}
              onChange={(event) =>
                setCategoryDraft((current) => ({
                  ...current,
                  description: event.target.value || null,
                }))
              }
              rows={2}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                <SaveIcon aria-hidden /> Save
              </Button>
              {categoryDraft.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setCategoryDraft({ id: null, name: "", slug: "", description: null, sort: 0 })
                  }
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>Merge tags to keep search filters tidy.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            {tags.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-fg-muted">
                      /{item.slug} · {item.jobsCount} jobs
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit ${item.name}`}
                    onClick={() => setTagDraft({ id: item.id, name: item.name, slug: item.slug })}
                  >
                    <PencilIcon aria-hidden />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Select
                    value={tagTargets[item.id] ?? ""}
                    onValueChange={(value) =>
                      setTagTargets((current) => ({ ...current, [item.id]: value }))
                    }
                  >
                    <SelectTrigger className="min-w-48">
                      <SelectValue placeholder="Reassign / merge into…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags
                        .filter((target) => target.id !== item.id)
                        .map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!tagTargets[item.id] || pending}
                    onClick={() => {
                      const target = tagTargets[item.id];
                      if (target) run(() => mergeTag(item.id, target), "Tag merged.");
                    }}
                  >
                    Merge
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      const target = tagTargets[item.id] || null;
                      const suffix = target
                        ? ` and reassign its jobs to “${tags.find((tag) => tag.id === target)?.name ?? "the selected tag"}”`
                        : "";
                      if (window.confirm(`Delete tag “${item.name}”${suffix}?`))
                        run(() => deleteTag(item.id, target), "Tag deleted.");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <form
            className="grid gap-2 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => saveTag(tagDraft), "Tag saved.");
              setTagDraft({ id: null, name: "", slug: "" });
            }}
          >
            <p className="text-sm font-medium">{tagDraft.id ? "Edit tag" : "New tag"}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Tag name"
                placeholder="Name"
                value={tagDraft.name}
                onChange={(event) =>
                  setTagDraft((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: current.id ? current.slug : slugify(event.target.value),
                  }))
                }
                required
              />
              <Input
                aria-label="Tag slug"
                placeholder="slug"
                value={tagDraft.slug}
                onChange={(event) =>
                  setTagDraft((current) => ({ ...current, slug: slugify(event.target.value) }))
                }
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                <SaveIcon aria-hidden /> Save
              </Button>
              {tagDraft.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setTagDraft({ id: null, name: "", slug: "" })}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
          {message ? <p className="text-sm text-fg-muted">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function parseFooterLinks(value: string): SiteSettingsInput["footerLinks"] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed as SiteSettingsInput["footerLinks"];
  } catch {
    return null;
  }
}

export function SettingsForm({ config }: { config: PublicSiteConfig }) {
  const [siteName, setSiteName] = useState(config.siteName);
  const [tagline, setTagline] = useState(config.tagline);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl ?? "");
  const [accent, setAccent] = useState(config.accent);
  const [preset, setPreset] = useState(config.preset);
  const [defaultCurrency, setDefaultCurrency] = useState(config.defaultCurrency);
  const [allowedApplyModes, setAllowedApplyModes] = useState<
    SiteSettingsInput["allowedApplyModes"]
  >(config.allowedApplyModes);
  const [autoPublishOnPayment, setAutoPublishOnPayment] = useState(config.autoPublishOnPayment);
  const [alertFrequency, setAlertFrequency] = useState(config.alertFrequency);
  const [pseoMinimumLiveJobs, setPseoMinimumLiveJobs] = useState(config.pseoMinimumLiveJobs);
  const [footerLinks, setFooterLinks] = useState(JSON.stringify(config.footerLinks, null, 2));
  const [analyticsSnippet, setAnalyticsSnippet] = useState(config.analyticsSnippet);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const toggleMode = (mode: SiteSettingsInput["allowedApplyModes"][number]) =>
    setAllowedApplyModes((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode],
    );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const links = parseFooterLinks(footerLinks);
    if (!links) {
      setMessage("Footer links must be a JSON array of { label, href } objects.");
      return;
    }
    setMessage(null);
    const input: SiteSettingsInput = {
      siteName,
      tagline,
      logoUrl,
      accent,
      preset,
      defaultCurrency,
      allowedApplyModes,
      autoPublishOnPayment,
      alertFrequency,
      pseoMinimumLiveJobs,
      footerLinks: links,
      analyticsSnippet,
    };
    startTransition(async () => {
      const result = await updateSiteSettings(input);
      setMessage(
        result.ok
          ? "Settings saved. Public pages will use them on the next request."
          : result.error,
      );
    });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Board settings</CardTitle>
        <CardDescription>
          These values are stored in Supabase and apply without a rebuild.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="site-name">Site name</Label>
              <Input
                id="site-name"
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="site-tagline">Tagline</Label>
              <Input
                id="site-tagline"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="site-logo">Logo URL (HTTPS)</Label>
              <Input
                id="site-logo"
                type="url"
                placeholder="https://…"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="default-currency">Default currency</Label>
              <Input
                id="default-currency"
                maxLength={3}
                value={defaultCurrency}
                onChange={(event) => setDefaultCurrency(event.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="accent">Accent</Label>
              <Select value={accent} onValueChange={(value) => setAccent(value as typeof accent)}>
                <SelectTrigger id="accent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="violet">Violet</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="preset">Preset</Label>
              <Select value={preset} onValueChange={(value) => setPreset(value as typeof preset)}>
                <SelectTrigger id="preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 border-t border-border pt-5">
            <p className="text-sm font-medium">Application modes</p>
            <div className="flex flex-wrap gap-4">
              {(["url", "email", "onsite"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={allowedApplyModes.includes(mode)}
                    onCheckedChange={() => toggleMode(mode)}
                  />
                  {mode === "url" ? "External URL" : mode === "email" ? "Email" : "On-site form"}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-3 border-t border-border pt-5">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Auto-publish after payment</span>
                <span className="mt-1 block text-xs text-fg-muted">
                  When disabled, paid jobs wait in the review queue.
                </span>
              </span>
              <Switch checked={autoPublishOnPayment} onCheckedChange={setAutoPublishOnPayment} />
            </label>
            <div className="grid max-w-sm gap-1.5">
              <Label htmlFor="alert-frequency">Default alert frequency</Label>
              <Select
                value={alertFrequency}
                onValueChange={(value) => setAlertFrequency(value as typeof alertFrequency)}
              >
                <SelectTrigger id="alert-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid max-w-sm gap-1.5">
              <Label htmlFor="pseo-minimum-live-jobs">Minimum jobs for pSEO pages</Label>
              <Input
                id="pseo-minimum-live-jobs"
                type="number"
                min={1}
                max={1000}
                value={pseoMinimumLiveJobs}
                onChange={(event) => setPseoMinimumLiveJobs(Number(event.target.value))}
              />
              <p className="text-xs text-fg-muted">Pages below this live-job count return 404.</p>
            </div>
          </div>
          <div className="grid gap-1.5 border-t border-border pt-5">
            <Label htmlFor="footer-links">Footer links (JSON)</Label>
            <Textarea
              id="footer-links"
              rows={5}
              value={footerLinks}
              onChange={(event) => setFooterLinks(event.target.value)}
            />
            <p className="text-xs text-fg-muted">
              Example: [{`{"label":"About","href":"/about"}`}].
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="analytics-snippet">Analytics script tag</Label>
            <Textarea
              id="analytics-snippet"
              rows={4}
              value={analyticsSnippet}
              onChange={(event) => setAnalyticsSnippet(event.target.value)}
              placeholder={
                '<script src="https://analytics.example/script.js" data-website-id="…"></script>'
              }
            />
            <p className="text-xs text-fg-muted">
              Only external HTTPS scripts are accepted; inline JavaScript is rejected.
            </p>
          </div>
          {message ? (
            <p role="status" className="text-sm text-fg-muted">
              {message}
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={pending}>
              <SaveIcon aria-hidden /> {pending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SubscribersTable({ subscribers }: { subscribers: Paginated<AdminSubscriber> }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {subscribers.total} subscriber{subscribers.total === 1 ? "" : "s"}
        </p>
        <Button asChild variant="outline">
          <Link href="/admin/subscribers/export" prefetch={false}>
            <DownloadIcon aria-hidden /> Export CSV
          </Link>
        </Button>
      </div>
      <DataTable
        rows={subscribers.data}
        getRowKey={(item) => item.id}
        columns={[
          {
            key: "email",
            header: "Email",
            value: (item) => item.email,
            cell: (item) => <span className="font-medium">{item.email}</span>,
          },
          {
            key: "frequency",
            header: "Frequency",
            value: (item) => item.frequency,
            cell: (item) => item.frequency,
          },
          {
            key: "status",
            header: "Status",
            value: (item) => item.unsubscribed_at ?? item.confirmed_at ?? "",
            cell: (item) => (
              <span className={item.unsubscribed_at ? "text-fg-muted" : "text-success"}>
                {item.unsubscribed_at
                  ? "Unsubscribed"
                  : item.confirmed_at
                    ? "Confirmed"
                    : "Pending"}
              </span>
            ),
          },
          {
            key: "created",
            header: "Joined",
            value: (item) => item.created_at,
            cell: (item) => formatDate(item.created_at),
          },
        ]}
        empty={
          <EmptyState
            icon={DownloadIcon}
            title="No subscribers yet."
            description="Subscribers will appear after they sign up for alerts."
          />
        }
      />
      {subscribers.hasNext ? (
        <Button asChild variant="outline" className="justify-self-start">
          <Link href={`/admin/subscribers?page=${subscribers.page + 1}`}>
            Next page <ChevronRightIcon aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function RecentAdminActions({ actions }: { actions: AdminAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent admin activity</CardTitle>
        <CardDescription>Every successful admin mutation is recorded here.</CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-fg-muted">No admin activity yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {actions.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="text-xs text-fg-muted">
                    {item.target_type} · {item.target_id}
                    {item.actorName ? ` · ${item.actorName}` : ""}
                  </p>
                </div>
                <time className="text-xs text-fg-subtle" dateTime={item.created_at}>
                  {formatDate(item.created_at)}
                </time>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

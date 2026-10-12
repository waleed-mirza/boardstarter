import Link from "next/link";
import { ArrowLeftIcon, Building2Icon, MapPinIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { JobMarkdown } from "@/components/jobs/job-markdown";
import { PageHeader } from "@/components/patterns/page-header";
import { StatusPill } from "@/components/patterns/status-pill";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminJobById } from "@/lib/data/admin/jobs";
import { createClient } from "@/lib/supabase/server";

export default async function AdminJobPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("/admin");
  const { id } = await params;
  const job = await getAdminJobById(await createClient(), id);
  if (!job) notFound();
  return <div className="grid gap-6"><PageHeader title="Listing preview" description="This preview is private and does not change the public board." actions={<Link href="/admin" className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-bg-muted focus-ring"><ArrowLeftIcon className="size-4" aria-hidden /> Back to queue</Link>} /><article className="rounded-xl border border-border bg-bg p-6 md:p-8"><header className="border-b border-border pb-6"><div className="flex flex-wrap items-center gap-2"><StatusPill status={job.status === "pending_review" ? "pending" : job.status === "published" ? "live" : job.status} /><span className="text-sm text-accent-text">{job.company.name}</span></div><h1 className="mt-3 text-3xl font-semibold tracking-tight">{job.title}</h1><p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted"><span className="inline-flex items-center gap-1"><MapPinIcon className="size-4" aria-hidden />{job.is_remote ? `Remote${job.remote_region ? ` · ${job.remote_region}` : ""}` : job.location ?? "Location not specified"}</span><span aria-hidden>·</span><span>{job.employment_type.replaceAll("_", " ")}</span></p></header><div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]"><div><JobMarkdown source={job.description_md} /></div><aside className="h-fit rounded-lg border border-border p-4 text-sm text-fg-muted"><p className="font-medium text-fg">{job.company.name}</p><p className="mt-3 flex items-start gap-2"><Building2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />{job.company.name}</p><dl className="mt-4 grid gap-2"><div className="flex justify-between gap-3"><dt>Category</dt><dd className="text-fg">{job.category.name}</dd></div><div className="flex justify-between gap-3"><dt>Orders</dt><dd className="text-fg">{job.ordersCount}</dd></div><div className="flex justify-between gap-3"><dt>Expires</dt><dd className="text-fg">{job.expires_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(job.expires_at)) : "Not set"}</dd></div></dl></aside></div></article></div>;
}

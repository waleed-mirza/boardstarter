import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { JobDetailSkeleton } from "@/components/patterns/skeletons";
import { JobDetailView } from "@/components/jobs/job-detail";
import { getJobBySlug, getJobsForCompanySlug } from "@/lib/data/jobs";
import { buildJobPostingJsonLdFromDetail, serializeJsonLd } from "@/lib/seo/job-posting";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) {
    return {
      title: "Job not found",
      description: "This job listing is not available on the board.",
      robots: { index: false, follow: true },
    };
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const location = job.isRemote
    ? `Remote${job.remoteRegion ? ` · ${job.remoteRegion}` : ""}`
    : job.location;
  return buildPageMetadata({
    siteUrl,
    title: `${job.title} · ${job.company.name}`,
    description: `${job.title} at ${job.company.name}${location ? ` in ${location}` : ""}. Apply on this listing for role details, compensation, and how to apply.`,
    path: `/jobs/${job.slug}`,
    image: `/jobs/${job.slug}/opengraph-image`,
    noindex: job.isExpired,
  });
}

export default function JobPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<JobDetailSkeleton />}>
      <JobContent params={params} />
    </Suspense>
  );
}

async function JobContent({ params }: { params: Params }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) notFound();
  const moreJobs = await getJobsForCompanySlug(job.company.slug, 1);
  const jsonLd = buildJobPostingJsonLdFromDetail(
    job,
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <JobDetailView
        job={job}
        moreJobs={moreJobs.data.filter((item) => item.id !== job.id).slice(0, 3)}
      />
    </>
  );
}

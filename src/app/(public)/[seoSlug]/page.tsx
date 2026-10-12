import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { JobList } from "@/components/jobs/job-list";
import { getCachedPublicSiteConfig } from "@/lib/data/settings";
import { createPublicClient } from "@/lib/supabase/server";
import { queryPublicSeoCatalog, findPseoTarget, toSeoJobListItem } from "@/lib/data/seo";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildPseoIntro, parsePseoSlug, pseoLocationSlug } from "@/lib/seo/pseo";

type Params = Promise<{ seoSlug: string }>;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const instant = false;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { seoSlug } = await params;
  const [catalog, config] = await Promise.all([
    queryPublicSeoCatalog(createPublicClient()),
    getCachedPublicSiteConfig(),
  ]);
  const target = findPseoTarget(catalog, seoSlug, config.pseoMinimumLiveJobs);
  if (!target) notFound();
  const title =
    target.kind === "remote-category" ? `${target.label} remote jobs` : `Jobs in ${target.label}`;
  const description = buildPseoIntro(
    parsePseoSlug(target.slug)!,
    target.label,
    target.liveJobCount,
  );
  return buildPageMetadata({ siteUrl, title, description, path: `/${target.slug}` });
}

export default async function PseoPage({ params }: { params: Params }) {
  const { seoSlug } = await params;
  await connection();
  const [catalog, config] = await Promise.all([
    queryPublicSeoCatalog(createPublicClient()),
    getCachedPublicSiteConfig(),
  ]);
  const target = findPseoTarget(catalog, seoSlug, config.pseoMinimumLiveJobs);
  const route = parsePseoSlug(seoSlug);
  if (!target || !route) notFound();

  const jobs = catalog.jobs.filter((job) => {
    if (target.kind === "remote-category") {
      return job.is_remote && job.category_slug === target.categorySlug;
    }
    if (route.kind !== "location" || !job.location) return false;
    return pseoLocationSlug(job.location) === route.locationSlug;
  });
  if (jobs.length < config.pseoMinimumLiveJobs) notFound();
  const intro = buildPseoIntro(route, target.label, jobs.length);
  return (
    <main className="container-page py-8 md:py-12">
      <header className="max-w-content">
        <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">Live jobs</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {target.kind === "remote-category"
            ? `${target.label} remote jobs`
            : `Jobs in ${target.label}`}
        </h1>
        <p className="mt-3 text-sm text-fg-muted">{intro}</p>
      </header>
      <section className="mt-8" aria-label={`${target.label} jobs`}>
        <JobList
          jobs={jobs.map(toSeoJobListItem)}
          asOf={catalog.latestPublishedAt ?? undefined}
          emptyTitle="No live jobs"
        />
      </section>
    </main>
  );
}

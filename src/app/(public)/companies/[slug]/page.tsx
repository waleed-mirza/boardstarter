import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CompanyLogo } from "@/components/jobs/company-logo";
import { JobList } from "@/components/jobs/job-list";
import { getPublicCompanyBySlug } from "@/lib/data/companies";
import { getJobsForCompanySlug } from "@/lib/data/jobs";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const company = await getPublicCompanyBySlug(slug);
  if (!company) return { title: "Company not found", robots: { index: false, follow: true } };
  return buildPageMetadata({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    title: company.name,
    description: company.description ?? `Live jobs at ${company.name}.`,
    path: `/companies/${company.slug}`,
  });
}

export default function CompanyPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <main className="container-page py-12">
          <div className="h-48 animate-pulse rounded-lg bg-bg-muted" />
        </main>
      }
    >
      <CompanyContent params={params} />
    </Suspense>
  );
}

async function CompanyContent({ params }: { params: Params }) {
  const { slug } = await params;
  const [company, jobs] = await Promise.all([
    getPublicCompanyBySlug(slug),
    getJobsForCompanySlug(slug),
  ]);
  if (!company) notFound();
  return (
    <main className="container-page py-8 md:py-12">
      <header className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-center">
        <CompanyLogo name={company.name} src={company.logoUrl} size={48} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <p className="mt-2 text-sm text-fg-muted">
            {company.location ?? "Distributed team"} · {company.liveJobCount} live{" "}
            {company.liveJobCount === 1 ? "job" : "jobs"}
          </p>
        </div>
      </header>
      {company.description ? (
        <p className="mt-8 max-w-prose text-base text-fg-muted">{company.description}</p>
      ) : null}
      {company.website ? (
        <a
          href={company.website}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm text-accent-text focus-ring hover:underline"
        >
          Visit company website
        </a>
      ) : null}
      <section className="mt-12" aria-labelledby="company-jobs">
        <h2 id="company-jobs" className="text-xl font-semibold tracking-tight">
          Open roles
        </h2>
        <div className="mt-4">
          <JobList jobs={jobs.data} asOf={jobs.asOf} emptyTitle="No live jobs" />
        </div>
      </section>
    </main>
  );
}

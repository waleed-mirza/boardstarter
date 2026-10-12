import { Suspense } from "react";
import { SearchIcon } from "lucide-react";

import { ActiveFilterChips } from "@/components/jobs/active-filter-chips";
import { FilterPanel } from "@/components/jobs/filter-panel";
import { JobList } from "@/components/jobs/job-list";
import { JobListToolbar } from "@/components/jobs/job-list-toolbar";
import { JobPagination } from "@/components/jobs/job-pagination";
import { MobileJobFilters } from "@/components/jobs/mobile-job-filters";
import { JobsPageSkeleton } from "@/components/patterns/skeletons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPublicJobFacets } from "@/lib/data/stats";
import { listPublishedJobs } from "@/lib/data/jobs";
import {
  activeFilterCount,
  parseJobSearchParams,
  type PublicJobSearchParams,
} from "@/lib/jobs/filters";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  title: "Browse jobs",
  description: "Search live roles from teams building useful things.",
  path: "/jobs",
});

export default function JobsPage({
  searchParams,
}: {
  searchParams: Promise<PublicJobSearchParams>;
}) {
  return (
    <Suspense fallback={<JobsPageSkeleton />}>
      <JobsResults searchParams={searchParams} />
    </Suspense>
  );
}

async function JobsResults({ searchParams }: { searchParams: Promise<PublicJobSearchParams> }) {
  const params = await searchParams;
  const { filters, page } = parseJobSearchParams(params);
  const [result, facets] = await Promise.all([
    listPublishedJobs(filters, page),
    getPublicJobFacets(),
  ]);
  const count = activeFilterCount(filters);
  return (
    <main className="container-page py-8 md:py-12">
      <header className="max-w-content">
        <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">Open roles</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Browse jobs</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Search a dense list of live roles and share any filtered view.
        </p>
        <form
          action="/jobs"
          method="get"
          className="mt-6 flex flex-col gap-2 sm:flex-row"
          role="search"
        >
          <label htmlFor="jobs-query" className="sr-only">
            Search jobs
          </label>
          <Input
            id="jobs-query"
            name="q"
            defaultValue={filters.query}
            placeholder="Search roles, skills, or teams"
            className="min-h-11 flex-1"
          />
          <label htmlFor="jobs-location" className="sr-only">
            Location
          </label>
          <Input
            id="jobs-location"
            name="location"
            defaultValue={filters.location}
            placeholder="Location"
            className="min-h-11 sm:max-w-52"
          />
          {filters.categories?.map((value) => (
            <input key={`q-category-${value}`} type="hidden" name="category" value={value} />
          ))}
          {filters.employmentTypes?.map((value) => (
            <input key={`q-type-${value}`} type="hidden" name="type" value={value} />
          ))}
          {filters.tags?.map((value) => (
            <input key={`q-tag-${value}`} type="hidden" name="tag" value={value} />
          ))}
          {filters.remote !== undefined ? (
            <input type="hidden" name="remote" value={filters.remote ? "1" : "0"} />
          ) : null}
          {filters.salaryBand ? (
            <input type="hidden" name="salary" value={filters.salaryBand} />
          ) : null}
          <Button type="submit" size="lg" className="min-h-11">
            <SearchIcon aria-hidden /> Search
          </Button>
        </form>
      </header>
      <div className="mt-8 flex items-center justify-between gap-3 md:hidden">
        <MobileJobFilters filters={filters} facets={facets} count={count} />
      </div>
      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[var(--container-filter)_minmax(0,1fr)] lg:gap-8">
        <aside
          className="sticky top-20 hidden self-start rounded-lg border border-border bg-bg p-4 lg:block"
          aria-label="Job filters"
        >
          <FilterPanel filters={filters} facets={facets} />
        </aside>
        <section className="min-w-0" aria-label="Job results">
          <ActiveFilterChips filters={filters} />
          <div className={count ? "mt-4" : ""}>
            <JobListToolbar filters={filters} total={result.total} />
          </div>
          <div className="mt-4">
            <JobList jobs={result.data} asOf={result.asOf} />
          </div>
          <JobPagination
            filters={filters}
            page={result.page}
            total={result.total}
            pageSize={result.pageSize}
          />
        </section>
      </div>
    </main>
  );
}

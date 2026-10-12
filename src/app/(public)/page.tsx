import Link from "next/link";
import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";

import { JobList } from "@/components/jobs/job-list";
import { AlertSignupForm } from "@/components/alerts/alert-signup-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getHomePageData } from "@/lib/data/stats";
import { formatRelativeDate } from "@/lib/jobs/format";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  title: "Thoughtful jobs for teams building what is next",
  description: "Browse carefully selected work from teams building useful things.",
  path: "/",
});

export default async function HomePage() {
  const { stats, featured, latest, categories } = await getHomePageData();
  return (
    <main>
      <section className="container-page py-16 md:py-24">
        <div className="max-w-content">
          <p className="text-sm font-medium text-accent-text">
            A focused board for thoughtful teams
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-3xl">
            Find your next role.
          </h1>
          <p className="mt-4 max-w-prose text-lg text-fg-muted">
            Browse carefully selected work from teams building useful things.
          </p>
          <form
            action="/jobs"
            method="get"
            className="mt-8 flex flex-col gap-2 sm:flex-row"
            role="search"
          >
            <label className="sr-only" htmlFor="home-query">
              Search jobs
            </label>
            <Input
              id="home-query"
              name="q"
              placeholder="Search roles, skills, or teams"
              className="min-h-11 flex-1"
            />
            <label className="sr-only" htmlFor="home-location">
              Location
            </label>
            <Input
              id="home-location"
              name="location"
              placeholder="Location"
              className="min-h-11 sm:max-w-52"
            />
            <Button type="submit" size="lg" className="min-h-11">
              <SearchIcon aria-hidden /> Search jobs
            </Button>
          </form>
        </div>
        <p className="mt-8 text-sm text-fg-muted">
          <span className="text-fg tabular-nums">{stats.jobCount}</span> jobs ·{" "}
          <span className="text-fg tabular-nums">{stats.companyCount}</span> companies · updated{" "}
          {stats.latestPublishedAt
            ? formatRelativeDate(stats.latestPublishedAt, stats.asOf)
            : "recently"}
        </p>
      </section>

      <section
        className="container-page border-t border-border py-12"
        aria-labelledby="featured-heading"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">
              Selected roles
            </p>
            <h2 id="featured-heading" className="mt-2 text-xl font-semibold tracking-tight">
              Featured jobs
            </h2>
          </div>
          <Link href="/jobs" className="text-sm text-accent-text focus-ring hover:underline">
            Browse all
          </Link>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {featured.data.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.slug}`}
              className="border-y border-r border-l-2 border-accent border-border p-4 focus-ring transition-colors duration-120 hover:bg-bg-muted"
            >
              <p className="text-lg font-semibold tracking-tight">{job.title}</p>
              <p className="mt-2 text-sm text-fg-muted">
                {job.company.name} · {job.isRemote ? "Remote" : job.location}
              </p>
              <p className="mt-4 text-xs text-fg-subtle">{job.categoryName}</p>
            </Link>
          ))}
        </div>
      </section>

      <section
        className="container-page border-t border-border py-12"
        aria-labelledby="latest-heading"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">
              Fresh opportunities
            </p>
            <h2 id="latest-heading" className="mt-2 text-xl font-semibold tracking-tight">
              Latest jobs
            </h2>
          </div>
          <Link href="/jobs" className="text-sm text-accent-text focus-ring hover:underline">
            Browse all jobs
          </Link>
        </div>
        <div className="mt-6">
          <JobList jobs={latest.data} asOf={latest.asOf} />
        </div>
      </section>

      <section
        className="container-page border-t border-border py-12"
        aria-labelledby="categories-heading"
      >
        <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">
          Explore by focus
        </p>
        <h2 id="categories-heading" className="mt-2 text-xl font-semibold tracking-tight">
          Categories
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.value}
              href={`/categories/${category.value}`}
              className="flex min-h-11 items-center justify-between border-b border-border text-sm focus-ring hover:text-accent-text"
            >
              <span>{category.label}</span>
              <span className="text-xs text-fg-subtle tabular-nums">{category.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section
        className="container-page border-t border-border py-12"
        aria-labelledby="alerts-heading"
      >
        <div className="max-w-content">
          <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">
            Stay close to new work
          </p>
          <h2 id="alerts-heading" className="mt-2 text-xl font-semibold tracking-tight">
            Get a quiet job note
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Confirm your address, then choose daily or weekly updates.
          </p>
          <div className="mt-5">
            <AlertSignupForm compact />
          </div>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { CompanyLogo } from "@/components/jobs/company-logo";
import { EmptyState } from "@/components/patterns/empty-state";
import { listPublicCompanies } from "@/lib/data/companies";
import { Building2Icon } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  title: "Companies hiring now",
  description: "Explore the teams behind the live roles.",
  path: "/companies",
});

export default async function CompaniesPage() {
  const companies = await listPublicCompanies();
  return (
    <main className="container-page py-8 md:py-12">
      <header>
        <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">
          Teams hiring now
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="mt-2 text-sm text-fg-muted">Explore the teams behind the live roles.</p>
      </header>
      {companies.length === 0 ? (
        <EmptyState
          icon={Building2Icon}
          title="No companies are hiring right now"
          description="Check back soon for new teams."
        />
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.slug}`}
              className="flex min-h-32 flex-col justify-between rounded-lg border border-border p-4 focus-ring hover:bg-bg-muted"
            >
              <div className="flex items-center gap-3">
                <CompanyLogo name={company.name} src={company.logoUrl} size={40} />
                <span className="font-medium">{company.name}</span>
              </div>
              <p className="text-sm text-fg-muted">
                {company.liveJobCount} live {company.liveJobCount === 1 ? "job" : "jobs"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

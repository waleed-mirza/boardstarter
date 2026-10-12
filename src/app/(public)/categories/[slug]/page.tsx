import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobList } from "@/components/jobs/job-list";
import { getJobsForCategorySlug } from "@/lib/data/jobs";
import { getPublicCategoryBySlug } from "@/lib/data/taxonomy";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false, follow: true } };
  return buildPageMetadata({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    title: `${category.name} jobs`,
    description: category.description ?? `Browse live ${category.name} jobs.`,
    path: `/categories/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, jobs] = await Promise.all([
    getPublicCategoryBySlug(slug),
    getJobsForCategorySlug(slug),
  ]);
  if (!category) notFound();
  return (
    <main className="container-page py-8 md:py-12">
      <header>
        <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">Category</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{category.name}</h1>
        {category.description ? (
          <p className="mt-2 max-w-prose text-sm text-fg-muted">{category.description}</p>
        ) : null}
      </header>
      <section className="mt-8">
        <JobList jobs={jobs.data} asOf={jobs.asOf} emptyTitle="No live jobs in this category" />
      </section>
    </main>
  );
}

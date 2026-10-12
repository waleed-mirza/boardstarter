import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobList } from "@/components/jobs/job-list";
import { getJobsForTagSlug } from "@/lib/data/jobs";
import { getPublicTagBySlug } from "@/lib/data/taxonomy";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getPublicTagBySlug(slug);
  if (!tag) return { title: "Tag not found", robots: { index: false, follow: true } };
  return buildPageMetadata({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    title: `${tag.name} jobs`,
    description: `Browse live roles tagged with ${tag.name}.`,
    path: `/tags/${tag.slug}`,
  });
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tag, jobs] = await Promise.all([getPublicTagBySlug(slug), getJobsForTagSlug(slug)]);
  if (!tag) notFound();
  return (
    <main className="container-page py-8 md:py-12">
      <header>
        <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">Tag</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{tag.name}</h1>
        <p className="mt-2 text-sm text-fg-muted">Live roles tagged with {tag.name}.</p>
      </header>
      <section className="mt-8">
        <JobList jobs={jobs.data} asOf={jobs.asOf} emptyTitle="No live jobs with this tag" />
      </section>
    </main>
  );
}

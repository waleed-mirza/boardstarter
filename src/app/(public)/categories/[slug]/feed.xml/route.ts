import { getPublicCategoryBySlug } from "@/lib/data/taxonomy";
import { getPublicSeoCatalog } from "@/lib/data/seo";
import { buildRssFeed } from "@/lib/seo/feed";

type Params = Promise<{ slug: string }>;

export async function GET(_request: Request, context: { params: Params }): Promise<Response> {
  const { slug } = await context.params;
  const [category, catalog] = await Promise.all([
    getPublicCategoryBySlug(slug),
    getPublicSeoCatalog(),
  ]);
  if (!category) return Response.json({ ok: false, error: "Category not found" }, { status: 404 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jobs = catalog.jobs.filter((job) => job.category_slug === slug);
  const xml = buildRssFeed({
    title: `${category.name} jobs`,
    description: category.description ?? `Live ${category.name} roles.`,
    url: `${siteUrl}/categories/${category.slug}`,
    updatedAt: jobs[0]?.updated_at ?? null,
    items: jobs.map((job) => ({
      title: job.title,
      url: `${siteUrl}/jobs/${job.slug}`,
      description: `${job.title} at ${job.company_name}.`,
      publishedAt: job.published_at,
      companyName: job.company_name,
      categoryName: job.category_name,
    })),
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

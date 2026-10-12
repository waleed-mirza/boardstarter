import { cacheLife, cacheTag } from "next/cache";

import { getPublicSeoCatalog } from "@/lib/data/seo";
import { getCachedPublicSiteConfig } from "@/lib/data/settings";
import { buildRssFeed } from "@/lib/seo/feed";

async function getBoardFeed(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  const [catalog, config] = await Promise.all([getPublicSeoCatalog(), getCachedPublicSiteConfig()]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return buildRssFeed({
    title: `${config.siteName} jobs`,
    description: config.tagline,
    url: siteUrl,
    updatedAt: catalog.latestPublishedAt,
    items: catalog.jobs.map((job) => ({
      title: job.title,
      url: `${siteUrl}/jobs/${job.slug}`,
      description: `${job.title} at ${job.company_name}${job.location ? ` in ${job.location}` : ""}.`,
      publishedAt: job.published_at,
      companyName: job.company_name,
      categoryName: job.category_name,
    })),
  });
}

export async function GET(): Promise<Response> {
  return new Response(await getBoardFeed(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

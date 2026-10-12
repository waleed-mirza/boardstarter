import type { MetadataRoute } from "next";

import { getCachedPublicSiteConfig } from "@/lib/data/settings";
import { getPublicSeoCatalog } from "@/lib/data/seo";
import { buildSitemap } from "@/lib/seo/sitemap";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, config] = await Promise.all([getPublicSeoCatalog(), getCachedPublicSiteConfig()]);
  const latest = catalog.latestPublishedAt ?? new Date().toISOString();
  const entries = [
    { url: siteUrl, lastModified: latest, changeFrequency: "daily" as const, priority: 1 },
    {
      url: `${siteUrl}/jobs`,
      lastModified: latest,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/companies`,
      lastModified: latest,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    ...catalog.jobs.map((job) => ({
      url: `${siteUrl}/jobs/${job.slug}`,
      lastModified: job.updated_at,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...catalog.companies.map((company) => ({
      url: `${siteUrl}/companies/${company.slug}`,
      lastModified: company.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...catalog.categories.map((category) => ({
      url: `${siteUrl}/categories/${category.slug}`,
      lastModified: category.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...catalog.tags.map((tag) => ({
      url: `${siteUrl}/tags/${tag.slug}`,
      lastModified: tag.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...catalog.pseo
      .filter((target) => target.liveJobCount >= config.pseoMinimumLiveJobs)
      .map((target) => ({
        url: `${siteUrl}/${target.slug}`,
        lastModified: target.lastModified,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
  ];
  return buildSitemap(entries);
}

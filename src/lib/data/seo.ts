import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/server";
import { parsePublicSeoCatalog, type PublicSeoJobRpc } from "@/lib/validation/public-board";

import { slugPart } from "../jobs/slug";
import type { JobListItem } from "./jobs";
import type { DatabaseClient } from "./types";

export type SeoJob = PublicSeoJobRpc;

export type SeoEntity = {
  slug: string;
  name: string;
  liveJobCount: number;
  lastModified: string;
};

export type PseoTarget = {
  kind: "remote-category" | "location";
  slug: string;
  label: string;
  categorySlug?: string;
  location?: string;
  liveJobCount: number;
  lastModified: string;
};

export type SeoCatalog = {
  jobs: SeoJob[];
  latestPublishedAt: string | null;
  companies: SeoEntity[];
  categories: SeoEntity[];
  tags: SeoEntity[];
  pseo: PseoTarget[];
};

/** Adapt the public SEO projection to the row shape used by the shared list UI. */
export function toSeoJobListItem(job: SeoJob): JobListItem {
  return {
    id: job.id,
    companyId: "seo-catalog",
    title: job.title,
    slug: job.slug,
    categoryId: job.category_id,
    categoryName: job.category_name,
    categorySlug: job.category_slug,
    employmentType: job.employment_type,
    location: job.location,
    isRemote: job.is_remote,
    remoteRegion: job.remote_region,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    currency: job.currency,
    salaryPeriod: job.salary_period,
    isFeatured: false,
    publishedAt: job.published_at,
    expiresAt: job.expires_at,
    published_at: job.published_at,
    expires_at: job.expires_at,
    createdAt: job.published_at,
    company: { name: job.company_name, slug: job.company_slug, logoUrl: job.company_logo_url },
    tags: job.tag_slugs,
  };
}

function newest(current: string | undefined, candidate: string): string {
  if (!current) return candidate;
  return new Date(candidate) > new Date(current) ? candidate : current;
}

function addEntity(
  map: Map<string, SeoEntity>,
  key: string,
  name: string,
  updatedAt: string,
): void {
  const existing = map.get(key);
  if (existing) {
    existing.liveJobCount += 1;
    existing.lastModified = newest(existing.lastModified, updatedAt);
    return;
  }
  map.set(key, { slug: key, name, liveJobCount: 1, lastModified: updatedAt });
}

function toSeoCatalog(jobs: SeoJob[], latestPublishedAt: string | null): SeoCatalog {
  const companies = new Map<string, SeoEntity>();
  const categories = new Map<string, SeoEntity>();
  const tags = new Map<string, SeoEntity>();
  const remoteCategories = new Map<string, PseoTarget>();
  const locations = new Map<string, PseoTarget>();

  for (const job of jobs) {
    addEntity(companies, job.company_slug, job.company_name, job.updated_at);
    addEntity(categories, job.category_slug, job.category_name, job.updated_at);
    for (const tag of job.tag_slugs) addEntity(tags, tag, tag, job.updated_at);

    if (job.is_remote) {
      const existing = remoteCategories.get(job.category_slug);
      if (existing) {
        existing.liveJobCount += 1;
        existing.lastModified = newest(existing.lastModified, job.updated_at);
      } else {
        remoteCategories.set(job.category_slug, {
          kind: "remote-category",
          slug: `remote-${job.category_slug}-jobs`,
          label: job.category_name,
          categorySlug: job.category_slug,
          liveJobCount: 1,
          lastModified: job.updated_at,
        });
      }
    }

    if (job.location?.trim()) {
      const locationSlug = slugPart(job.location, "location");
      const existing = locations.get(locationSlug);
      if (existing) {
        existing.liveJobCount += 1;
        existing.lastModified = newest(existing.lastModified, job.updated_at);
      } else {
        locations.set(locationSlug, {
          kind: "location",
          slug: `jobs-in-${locationSlug}`,
          label: job.location,
          location: job.location,
          liveJobCount: 1,
          lastModified: job.updated_at,
        });
      }
    }
  }

  return {
    jobs,
    latestPublishedAt,
    companies: [...companies.values()].sort((a, b) => a.name.localeCompare(b.name)),
    categories: [...categories.values()].sort((a, b) => a.name.localeCompare(b.name)),
    tags: [...tags.values()].sort((a, b) => a.name.localeCompare(b.name)),
    pseo: [...remoteCategories.values(), ...locations.values()].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    ),
  };
}

export async function queryPublicSeoCatalog(client: DatabaseClient): Promise<SeoCatalog> {
  const { data, error } = await client.rpc("get_public_seo_catalog");
  if (error) throw new Error(error.message);
  const parsed = parsePublicSeoCatalog(data);
  return toSeoCatalog(parsed.jobs, parsed.latestPublishedAt);
}

export async function getPublicSeoCatalog(): Promise<SeoCatalog> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return queryPublicSeoCatalog(createPublicClient());
}

export function findPseoTarget(
  catalog: SeoCatalog,
  slug: string,
  minimumLiveJobs: number,
): PseoTarget | null {
  const target = catalog.pseo.find((entry) => entry.slug === slug);
  return target && target.liveJobCount >= minimumLiveJobs ? target : null;
}

export async function getJobSlugForIndexing(
  client: DatabaseClient,
  id: string,
): Promise<string | null> {
  const { data, error } = await client.from("jobs").select("slug").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.slug ?? null;
}

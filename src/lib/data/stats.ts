import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/server";
import { parsePublicBoardStats, parsePublicFacetPayload } from "@/lib/validation/public-board";
import type { JobFacetCounts } from "@/lib/jobs/filters";
import { queryPublishedJobs, type JobListItem, type PublicPaginated } from "./jobs";
import type { DatabaseClient } from "./types";

export type PublicBoardStats = {
  jobCount: number;
  companyCount: number;
  latestPublishedAt: string | null;
  asOf: string;
};

export async function queryPublicBoardStats(client: DatabaseClient): Promise<PublicBoardStats> {
  const { data, error } = await client.rpc("get_public_board_stats");
  if (error) throw new Error(error.message);
  return parsePublicBoardStats(data);
}

export async function getPublicBoardStats(): Promise<PublicBoardStats> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return queryPublicBoardStats(createPublicClient());
}

export async function queryPublicJobFacets(client: DatabaseClient): Promise<JobFacetCounts> {
  const { data, error } = await client.rpc("get_public_job_facets", {
    p_filters: {},
  });
  if (error) throw new Error(error.message);
  return parsePublicFacetPayload(data);
}

export async function getPublicJobFacets(): Promise<JobFacetCounts> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return queryPublicJobFacets(createPublicClient());
}

export type HomePageData = {
  stats: PublicBoardStats;
  featured: PublicPaginated<JobListItem>;
  latest: PublicPaginated<JobListItem>;
  categories: JobFacetCounts["categories"];
};

export async function getHomePageData(): Promise<HomePageData> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return queryHomePageData(createPublicClient());
}

export async function queryHomePageData(client: DatabaseClient): Promise<HomePageData> {
  const statsPromise = queryPublicBoardStats(client);
  const featuredPromise = queryPublishedJobs(client, { featuredOnly: true }, 1, 3);
  const latestPromise = queryPublishedJobs(client, {}, 1, 10);
  const facetsPromise = client.rpc("get_public_job_facets", { p_filters: {} });
  const [stats, featured, latest, facetsResult] = await Promise.all([
    statsPromise,
    featuredPromise,
    latestPromise,
    facetsPromise,
  ]);
  if (facetsResult.error) throw new Error(facetsResult.error.message);
  const facets = parsePublicFacetPayload(facetsResult.data);
  return { stats, featured, latest, categories: facets.categories };
}

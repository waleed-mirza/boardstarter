import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/server";
import {
  getPaginationState,
  JOB_PAGE_SIZE,
  toRpcFilters,
  type JobFilters,
} from "@/lib/jobs/filters";
import {
  parsePublicJobDetail,
  parsePublicJobListPayload,
  type PublicJobDetailRpc,
  type PublicJobListRpcItem,
} from "@/lib/validation/public-board";

import type { DatabaseClient, JobRow, Paginated } from "./types";
import { requireData } from "./types";
import { createJobSlugBase, createJobSlugCandidate } from "@/lib/jobs/slug";

export { JOB_PAGE_SIZE } from "@/lib/jobs/filters";
export type { JobFilters } from "@/lib/jobs/filters";

export type JobListItem = {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  employmentType: PublicJobListRpcItem["employment_type"];
  location: string | null;
  isRemote: boolean;
  remoteRegion: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryPeriod: string;
  isFeatured: boolean;
  publishedAt: string;
  expiresAt: string;
  /** Legacy row aliases retained for existing data consumers during Week 4. */
  published_at: string;
  expires_at: string;
  createdAt: string;
  company: {
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  tags: string[];
};

export type PublicPaginated<T> = Paginated<T> & { asOf: string };

export type JobDetail = JobListItem & {
  descriptionMd: string;
  applyMode: PublicJobDetailRpc["apply_mode"];
  applyUrl: string | null;
  applyEmail: string | null;
  companyWebsite: string | null;
  companyDescription: string | null;
  companyLocation: string | null;
  updatedAt: string;
  status: PublicJobDetailRpc["status"];
  isExpired: boolean;
  asOf: string;
};

export type EmployerJob = JobRow & { applicationsCount: number; tagIds: string[] };

export type EmployerJobWrite = {
  title: string;
  descriptionMd: string;
  categoryId: string;
  employmentType: JobRow["employment_type"];
  location?: string;
  isRemote: boolean;
  remoteRegion?: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryPeriod: string;
  applyMode: JobRow["apply_mode"];
  applyUrl?: string;
  applyEmail?: string;
  tagIds: string[];
};

function toListItem(job: PublicJobListRpcItem): JobListItem {
  return {
    id: job.id,
    companyId: job.company_id,
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
    isFeatured: job.effective_featured,
    publishedAt: job.published_at,
    expiresAt: job.expires_at,
    published_at: job.published_at,
    expires_at: job.expires_at,
    createdAt: job.created_at,
    company: {
      name: job.company_name,
      slug: job.company_slug,
      logoUrl: job.company_logo_url,
    },
    tags: job.tag_slugs,
  };
}

function toDetail(job: PublicJobDetailRpc): JobDetail {
  return {
    ...toListItem({ ...job, effective_featured: job.is_featured && !job.is_expired }),
    descriptionMd: job.description_md,
    applyMode: job.apply_mode,
    applyUrl: job.apply_url,
    applyEmail: job.apply_email,
    companyWebsite: job.company_website,
    companyDescription: job.company_description,
    companyLocation: job.company_location,
    updatedAt: job.updated_at,
    status: job.status,
    isExpired: job.is_expired,
    asOf: job.as_of,
  };
}

export async function queryPublishedJobs(
  client: DatabaseClient,
  filters: JobFilters = {},
  page = 1,
  pageSize = JOB_PAGE_SIZE,
): Promise<PublicPaginated<JobListItem>> {
  const { data, error } = await client.rpc("search_public_jobs", {
    p_filters: toRpcFilters(filters),
    p_page: Math.max(1, Math.floor(page)),
    p_page_size: pageSize,
  });
  if (error) throw new Error(error.message);
  const payload = parsePublicJobListPayload(data);
  return {
    data: payload.data.map(toListItem),
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
    hasNext: payload.hasNext,
    asOf: payload.asOf,
  };
}

export async function queryJobBySlug(
  client: DatabaseClient,
  slug: string,
): Promise<JobDetail | null> {
  const { data, error } = await client.rpc("get_public_job_by_slug", { p_slug: slug });
  if (error) throw new Error(error.message);
  const parsed = parsePublicJobDetail(data);
  return parsed ? toDetail(parsed) : null;
}

async function cachedListPublishedJobs(
  filters: JobFilters = {},
  page = 1,
  pageSize = JOB_PAGE_SIZE,
): Promise<PublicPaginated<JobListItem>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return queryPublishedJobs(await createPublicClient(), filters, page, pageSize);
}

export function listPublishedJobs(
  client: DatabaseClient,
  filters?: JobFilters,
  page?: number,
): Promise<PublicPaginated<JobListItem>>;
export function listPublishedJobs(
  filters?: JobFilters,
  page?: number,
  pageSize?: number,
): Promise<PublicPaginated<JobListItem>>;
export async function listPublishedJobs(
  first: DatabaseClient | JobFilters = {},
  second: JobFilters | number = {},
  third?: number,
): Promise<PublicPaginated<JobListItem>> {
  if (typeof first === "object" && "rpc" in first && "from" in first) {
    return queryPublishedJobs(
      first,
      typeof second === "object" ? second : {},
      typeof third === "number" ? third : 1,
      JOB_PAGE_SIZE,
    );
  }
  return cachedListPublishedJobs(
    first as JobFilters,
    typeof second === "number" ? second : 1,
    third ?? JOB_PAGE_SIZE,
  );
}

async function cachedGetJobBySlug(slug: string): Promise<JobDetail | null> {
  "use cache";
  cacheLife("minutes");
  const job = await queryJobBySlug(await createPublicClient(), slug);
  cacheTag("jobs", job ? `job-${job.id}` : "jobs");
  return job;
}

export function getJobBySlug(client: DatabaseClient, slug: string): Promise<JobDetail | null>;
export function getJobBySlug(slug: string): Promise<JobDetail | null>;
export async function getJobBySlug(
  first: DatabaseClient | string,
  second?: string,
): Promise<JobDetail | null> {
  if (typeof first !== "string") return queryJobBySlug(first, second ?? "");
  return cachedGetJobBySlug(first);
}

export async function getJobsForCompanySlug(
  companySlug: string,
  page = 1,
): Promise<PublicPaginated<JobListItem>> {
  return listPublishedJobs({ companySlug }, page);
}

export async function getJobsForCategorySlug(
  categorySlug: string,
  page = 1,
): Promise<PublicPaginated<JobListItem>> {
  return listPublishedJobs({ categorySlug }, page);
}

export async function getJobsForTagSlug(
  tagSlug: string,
  page = 1,
): Promise<PublicPaginated<JobListItem>> {
  return listPublishedJobs({ tagSlug }, page);
}

export async function getEmployerJobs(
  client: DatabaseClient,
  companyId: string,
): Promise<EmployerJob[]> {
  const { data, error } = await client
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  const jobs = requireData(data, error) as JobRow[];
  if (jobs.length === 0) return [];

  const { data: applications, error: applicationsError } = await client
    .from("applications")
    .select("job_id")
    .in("job_id", jobs.map((job) => job.id));
  const applicationRows = requireData(applications, applicationsError) as Array<{ job_id: string }>;
  const counts = new Map<string, number>();
  for (const application of applicationRows) {
    counts.set(application.job_id, (counts.get(application.job_id) ?? 0) + 1);
  }
  const { data: jobTags, error: jobTagsError } = await client
    .from("job_tags")
    .select("job_id, tag_id")
    .in("job_id", jobs.map((job) => job.id));
  const tagRows = requireData(jobTags, jobTagsError) as Array<{ job_id: string; tag_id: string }>;
  const tagsByJob = new Map<string, string[]>();
  for (const tag of tagRows) {
    const current = tagsByJob.get(tag.job_id) ?? [];
    current.push(tag.tag_id);
    tagsByJob.set(tag.job_id, current);
  }
  return jobs.map((job) => ({
    ...job,
    applicationsCount: counts.get(job.id) ?? 0,
    tagIds: tagsByJob.get(job.id) ?? [],
  }));
}

export async function getEmployerJob(
  client: DatabaseClient,
  companyId: string,
  jobId: string,
): Promise<EmployerJob | null> {
  const { data, error } = await client
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { data: applications, error: applicationsError } = await client
    .from("applications")
    .select("job_id")
    .eq("job_id", jobId);
  const applicationRows = requireData(applications, applicationsError) as Array<{ job_id: string }>;
  const { data: jobTags, error: jobTagsError } = await client
    .from("job_tags")
    .select("tag_id")
    .eq("job_id", jobId);
  const tagRows = requireData(jobTags, jobTagsError) as Array<{ tag_id: string }>;
  return {
    ...(data as JobRow),
    applicationsCount: applicationRows.length,
    tagIds: tagRows.map((tag) => tag.tag_id),
  };
}

function toJobRowInput(companyId: string, slug: string, input: EmployerJobWrite) {
  return {
    company_id: companyId,
    title: input.title,
    slug,
    description_md: input.descriptionMd,
    category_id: input.categoryId,
    employment_type: input.employmentType,
    location: input.location ?? null,
    is_remote: input.isRemote,
    remote_region: input.remoteRegion ?? null,
    salary_min: input.salaryMin,
    salary_max: input.salaryMax,
    currency: input.currency,
    salary_period: input.salaryPeriod,
    apply_mode: input.applyMode,
    apply_url: input.applyUrl ?? null,
    apply_email: input.applyEmail ?? null,
  };
}

async function replaceJobTags(client: DatabaseClient, jobId: string, tagIds: readonly string[]) {
  const { error: deleteError } = await client.from("job_tags").delete().eq("job_id", jobId);
  if (deleteError) throw new Error(deleteError.message);
  if (tagIds.length === 0) return;
  const { error: insertError } = await client
    .from("job_tags")
    .insert(tagIds.map((tagId) => ({ job_id: jobId, tag_id: tagId })));
  if (insertError) throw new Error(insertError.message);
}

async function companySlug(client: DatabaseClient, companyId: string): Promise<string> {
  const { data, error } = await client.from("companies").select("slug").eq("id", companyId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Company not found");
  return data.slug;
}

export async function createDraft(
  client: DatabaseClient,
  companyId: string,
  input: EmployerJobWrite,
): Promise<EmployerJob> {
  const base = createJobSlugBase(input.title, await companySlug(client, companyId));
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await client
      .from("jobs")
      .insert(toJobRowInput(companyId, createJobSlugCandidate(base, attempt), input))
      .select("*")
      .single();
    if (!error && data) {
      try {
        await replaceJobTags(client, data.id, input.tagIds);
      } catch (tagError) {
        await client.from("jobs").delete().eq("id", data.id).eq("company_id", companyId);
        throw tagError;
      }
      return { ...(data as JobRow), applicationsCount: 0, tagIds: [...input.tagIds] };
    }
    if (error?.code !== "23505") throw new Error(error?.message ?? "Could not create the job draft");
    lastError = error.message;
  }
  throw new Error(lastError ?? "Could not create a unique job slug");
}

export async function updateEmployerJob(
  client: DatabaseClient,
  companyId: string,
  jobId: string,
  input: EmployerJobWrite,
): Promise<EmployerJob> {
  const { data, error } = await client
    .from("jobs")
    .update({
      title: input.title,
      description_md: input.descriptionMd,
      category_id: input.categoryId,
      employment_type: input.employmentType,
      location: input.location ?? null,
      is_remote: input.isRemote,
      remote_region: input.remoteRegion ?? null,
      salary_min: input.salaryMin,
      salary_max: input.salaryMax,
      currency: input.currency,
      salary_period: input.salaryPeriod,
      apply_mode: input.applyMode,
      apply_url: input.applyUrl ?? null,
      apply_email: input.applyEmail ?? null,
    })
    .eq("id", jobId)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job not found");
  await replaceJobTags(client, jobId, input.tagIds);
  return (await getEmployerJob(client, companyId, jobId)) ?? {
    ...(data as JobRow),
    applicationsCount: 0,
    tagIds: [...input.tagIds],
  };
}

export async function closeEmployerJob(client: DatabaseClient, jobId: string): Promise<boolean> {
  const { data, error } = await client.rpc("close_employer_job", { p_job_id: jobId });
  if (error) throw new Error(error.message);
  return data === true;
}

export function getLastPage(total: number, pageSize = JOB_PAGE_SIZE): number {
  return getPaginationState(1, total, pageSize).pageCount;
}

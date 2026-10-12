import type { JobRow, DatabaseClient, Paginated } from "../types";
import { requireData } from "../types";
import { callAdminMutation } from "./rpc";
import type { AdminJobFilters } from "@/lib/validation/admin";

export type AdminJob = JobRow & {
  company: { name: string; slug: string; logoUrl: string | null };
  category: { name: string; slug: string };
  ordersCount: number;
  applicationsCount: number;
};

const PAGE_SIZE = 20;

function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function withAdminRelations(
  client: DatabaseClient,
  jobs: JobRow[],
): Promise<AdminJob[]> {
  if (jobs.length === 0) return [];
  const companyIds = [...new Set(jobs.map((job) => job.company_id))];
  const categoryIds = [...new Set(jobs.map((job) => job.category_id))];
  const jobIds = jobs.map((job) => job.id);
  const [companies, categories, orders, applications] = await Promise.all([
    client.from("companies").select("id, name, slug, logo_url").in("id", companyIds),
    client.from("categories").select("id, name, slug").in("id", categoryIds),
    client.from("orders").select("job_id").in("job_id", jobIds),
    client.from("applications").select("job_id").in("job_id", jobIds),
  ]);
  const companyRows = requireData(companies.data, companies.error) as Array<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  }>;
  const categoryRows = requireData(categories.data, categories.error) as Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  const orderRows = requireData(orders.data, orders.error) as Array<{ job_id: string }>;
  const applicationRows = requireData(applications.data, applications.error) as Array<{ job_id: string }>;
  const companyById = new Map(companyRows.map((row) => [row.id, row]));
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));
  const orderCounts = new Map<string, number>();
  const applicationCounts = new Map<string, number>();
  for (const row of orderRows) orderCounts.set(row.job_id, (orderCounts.get(row.job_id) ?? 0) + 1);
  for (const row of applicationRows) applicationCounts.set(row.job_id, (applicationCounts.get(row.job_id) ?? 0) + 1);
  return jobs.map((job) => {
    const company = companyById.get(job.company_id);
    const category = categoryById.get(job.category_id);
    if (!company || !category) throw new Error("Admin job relation is missing.");
    return {
      ...job,
      company: { name: company.name, slug: company.slug, logoUrl: company.logo_url },
      category: { name: category.name, slug: category.slug },
      ordersCount: orderCounts.get(job.id) ?? 0,
      applicationsCount: applicationCounts.get(job.id) ?? 0,
    };
  });
}

export async function listAdminJobs(
  client: DatabaseClient,
  filters: AdminJobFilters,
): Promise<Paginated<AdminJob>> {
  let query = client.from("jobs").select("*", { count: "exact" });
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.query) {
    const escaped = escapeLike(filters.query);
    query = query.or(`title.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }
  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const jobs = requireData(data, error) as JobRow[];
  const total = count ?? 0;
  return {
    data: await withAdminRelations(client, jobs),
    page: filters.page,
    pageSize: PAGE_SIZE,
    total,
    hasNext: from + jobs.length < total,
  };
}

export async function listModerationQueue(client: DatabaseClient): Promise<AdminJob[]> {
  const result = await listAdminJobs(client, { query: "", status: "pending_review", page: 1 });
  return result.data;
}

export async function getAdminJobById(client: DatabaseClient, id: string): Promise<AdminJob | null> {
  const { data, error } = await client.from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [job] = await withAdminRelations(client, [data as JobRow]);
  return job ?? null;
}

export async function approveAdminJob(client: DatabaseClient, jobId: string) {
  const { data, error } = await client.rpc("admin_approve_job", { p_job_id: jobId });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function rejectAdminJob(client: DatabaseClient, jobId: string, reason: string) {
  const { data, error } = await client.rpc("admin_reject_job", { p_job_id: jobId, p_reason: reason });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function setAdminJobFeatured(client: DatabaseClient, jobId: string, featured: boolean) {
  const { data, error } = await client.rpc("admin_set_job_featured", { p_job_id: jobId, p_featured: featured });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function extendAdminJob(client: DatabaseClient, jobId: string, days: number) {
  const { data, error } = await client.rpc("admin_extend_job", { p_job_id: jobId, p_days: days });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function forceExpireAdminJob(client: DatabaseClient, jobId: string) {
  const { data, error } = await client.rpc("admin_force_expire_job", { p_job_id: jobId });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function deleteAdminJob(client: DatabaseClient, jobId: string) {
  const { data, error } = await client.rpc("admin_delete_job", { p_job_id: jobId });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

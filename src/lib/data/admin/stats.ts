import type { DatabaseClient, JobStatus } from "../types";
import { requireData } from "../types";

export type AdminStats = {
  jobsByStatus: Record<JobStatus, number>;
  revenueByCurrency: Array<{ currency: string; amountCents: number }>;
  topCategories: Array<{ name: string; count: number }>;
  subscriberCount: number;
};

const statuses: JobStatus[] = ["draft", "pending_review", "published", "rejected", "expired"];

export async function getAdminStats(client: DatabaseClient): Promise<AdminStats> {
  const [jobs, orders, categories, subscribers] = await Promise.all([
    client.from("jobs").select("status"),
    client.from("orders").select("amount_cents, currency, status"),
    client.from("jobs").select("category_id"),
    client.from("subscribers").select("id", { count: "exact", head: true }),
  ]);
  const jobRows = requireData(jobs.data, jobs.error) as Array<{ status: JobStatus }>;
  const orderRows = requireData(orders.data, orders.error) as Array<{ amount_cents: number; currency: string; status: string }>;
  const categoryJobs = requireData(categories.data, categories.error) as Array<{ category_id: string }>;
  const jobsByStatus = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<JobStatus, number>;
  for (const row of jobRows) jobsByStatus[row.status] += 1;
  const revenue = new Map<string, number>();
  for (const row of orderRows) {
    if (row.status !== "paid") continue;
    revenue.set(row.currency, (revenue.get(row.currency) ?? 0) + row.amount_cents);
  }
  const categoryIds = [...new Set(categoryJobs.map((row) => row.category_id))];
  const categoryResult = categoryIds.length
    ? await client.from("categories").select("id, name").in("id", categoryIds)
    : { data: [], error: null };
  const categoryRows = requireData(categoryResult.data, categoryResult.error) as Array<{ id: string; name: string }>;
  const categoryNames = new Map(categoryRows.map((row) => [row.id, row.name]));
  const categoryCounts = new Map<string, number>();
  for (const row of categoryJobs) categoryCounts.set(row.category_id, (categoryCounts.get(row.category_id) ?? 0) + 1);
  return {
    jobsByStatus,
    revenueByCurrency: [...revenue.entries()].map(([currency, amountCents]) => ({ currency, amountCents })),
    topCategories: [...categoryCounts.entries()]
      .map(([id, count]) => ({ name: categoryNames.get(id) ?? "Unknown", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    subscriberCount: subscribers.count ?? 0,
  };
}


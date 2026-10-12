import type { DatabaseClient, Paginated, SubscriberRow } from "../types";
import { requireData } from "../types";

export type AdminSubscriber = SubscriberRow;
const PAGE_SIZE = 50;

export async function listAdminSubscribers(client: DatabaseClient, page = 1): Promise<Paginated<AdminSubscriber>> {
  const from = (Math.max(1, page) - 1) * PAGE_SIZE;
  const { data, error, count } = await client
    .from("subscribers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const rows = requireData(data, error) as SubscriberRow[];
  const total = count ?? 0;
  return { data: rows, page: Math.max(1, page), pageSize: PAGE_SIZE, total, hasNext: from + rows.length < total };
}

export async function listAllAdminSubscribers(client: DatabaseClient): Promise<AdminSubscriber[]> {
  const rows: AdminSubscriber[] = [];
  for (let page = 1; ; page += 1) {
    const result = await listAdminSubscribers(client, page);
    rows.push(...result.data);
    if (!result.hasNext) return rows;
  }
}


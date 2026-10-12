import type { DatabaseClient } from "./types";

export type ExpiredJobTarget = { id: string; slug: string; expires_at: string };

export async function expireDueJobs(client: DatabaseClient): Promise<ExpiredJobTarget[]> {
  const { data, error } = await client.rpc("expire_due_jobs");
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid expiry response.");
  const jobs = (data as { expired?: unknown }).expired;
  return Array.isArray(jobs) ? (jobs as ExpiredJobTarget[]) : [];
}

export async function keepSupabaseAlive(client: DatabaseClient): Promise<void> {
  const { error } = await client.rpc("get_public_board_stats");
  if (error) throw new Error(error.message);
}

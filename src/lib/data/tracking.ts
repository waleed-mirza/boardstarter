import type { DatabaseClient } from "./types";

export type TrackingKind = "view" | "click";

export async function incrementJobCounter(
  client: DatabaseClient,
  jobId: string,
  kind: TrackingKind,
): Promise<number | null> {
  const { data, error } = await client.rpc("increment_job_counter", {
    p_job_id: jobId,
    p_kind: kind === "view" ? "views" : "clicks",
  });
  if (error) throw new Error(error.message);
  return data;
}

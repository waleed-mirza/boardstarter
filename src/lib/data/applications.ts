import type { ApplicationInput } from "@/lib/validation/application";

import type { DatabaseClient } from "./types";

export async function submitApplication(client: DatabaseClient, input: ApplicationInput) {
  const { data, error } = await client
    .from("applications")
    .insert({
      job_id: input.jobId,
      name: input.name,
      email: input.email.trim().toLowerCase(),
      message: input.message?.trim() || null,
    })
    .select("id, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

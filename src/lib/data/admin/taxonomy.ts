import type { CategoryRow, DatabaseClient, TagRow } from "../types";
import { requireData } from "../types";
import type { CategoryInput, TagInput } from "@/lib/validation/admin";
import { callAdminMutation } from "./rpc";

export type AdminCategory = CategoryRow & { jobsCount: number };
export type AdminTag = TagRow & { jobsCount: number };

export async function listAdminCategories(client: DatabaseClient): Promise<AdminCategory[]> {
  const { data, error } = await client.from("categories").select("*").order("sort", { ascending: true });
  const rows = requireData(data, error) as CategoryRow[];
  if (rows.length === 0) return [];
  const counts = await client.from("jobs").select("category_id").in("category_id", rows.map((row) => row.id));
  const jobs = requireData(counts.data, counts.error) as Array<{ category_id: string }>;
  const byId = new Map<string, number>();
  for (const row of jobs) byId.set(row.category_id, (byId.get(row.category_id) ?? 0) + 1);
  return rows.map((row) => ({ ...row, jobsCount: byId.get(row.id) ?? 0 }));
}

export async function listAdminTags(client: DatabaseClient): Promise<AdminTag[]> {
  const { data, error } = await client.from("tags").select("*").order("name");
  const rows = requireData(data, error) as TagRow[];
  if (rows.length === 0) return [];
  const counts = await client.from("job_tags").select("tag_id").in("tag_id", rows.map((row) => row.id));
  const jobs = requireData(counts.data, counts.error) as Array<{ tag_id: string }>;
  const byId = new Map<string, number>();
  for (const row of jobs) byId.set(row.tag_id, (byId.get(row.tag_id) ?? 0) + 1);
  return rows.map((row) => ({ ...row, jobsCount: byId.get(row.id) ?? 0 }));
}

export async function upsertAdminCategory(client: DatabaseClient, input: CategoryInput) {
  const { data, error } = await client.rpc("admin_upsert_category", {
    p_id: input.id ?? null,
    p_name: input.name,
    p_slug: input.slug,
    p_description: input.description,
    p_sort: input.sort,
  });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function mergeAdminCategory(client: DatabaseClient, sourceId: string, targetId: string) {
  const { data, error } = await client.rpc("admin_merge_category", { p_source_id: sourceId, p_target_id: targetId });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function deleteAdminCategory(client: DatabaseClient, id: string, reassignTo: string | null) {
  const { data, error } = await client.rpc("admin_delete_category", { p_id: id, p_reassign_to: reassignTo });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function upsertAdminTag(client: DatabaseClient, input: TagInput) {
  const { data, error } = await client.rpc("admin_upsert_tag", {
    p_id: input.id ?? null,
    p_name: input.name,
    p_slug: input.slug,
  });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function mergeAdminTag(client: DatabaseClient, sourceId: string, targetId: string) {
  const { data, error } = await client.rpc("admin_merge_tag", { p_source_id: sourceId, p_target_id: targetId });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function deleteAdminTag(client: DatabaseClient, id: string, reassignTo: string | null) {
  const { data, error } = await client.rpc("admin_delete_tag", { p_id: id, p_reassign_to: reassignTo });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}


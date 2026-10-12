import type { CategoryRow, DatabaseClient, TagRow } from "./types";
import { requireData } from "./types";
import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/server";

export async function listCategories(client: DatabaseClient): Promise<CategoryRow[]> {
  const { data, error } = await client.from("categories").select("*").order("sort");
  return requireData(data, error) as CategoryRow[];
}

export async function listTags(client: DatabaseClient): Promise<TagRow[]> {
  const { data, error } = await client.from("tags").select("*").order("name");
  return requireData(data, error) as TagRow[];
}

export async function listPublicCategories(): Promise<CategoryRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return listCategories(createPublicClient());
}

export async function listPublicTags(): Promise<TagRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return listTags(createPublicClient());
}

export async function getCategoryBySlug(
  client: DatabaseClient,
  slug: string,
): Promise<CategoryRow | null> {
  const { data, error } = await client
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getTagBySlug(client: DatabaseClient, slug: string): Promise<TagRow | null> {
  const { data, error } = await client.from("tags").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPublicCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  const client = createPublicClient();
  const { data, error } = await client.from("categories").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPublicTagBySlug(slug: string): Promise<TagRow | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  const client = createPublicClient();
  const { data, error } = await client.from("tags").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

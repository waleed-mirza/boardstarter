import type { DatabaseClient, PackageRow } from "./types";
import { requireData } from "./types";

export async function listActivePackages(client: DatabaseClient): Promise<PackageRow[]> {
  const { data, error } = await client
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("sort", { ascending: true });
  return requireData(data, error) as PackageRow[];
}

export async function getPackageById(
  client: DatabaseClient,
  id: string,
): Promise<PackageRow | null> {
  const { data, error } = await client.from("packages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPackageByVariantId(
  client: DatabaseClient,
  variantId: string,
): Promise<PackageRow | null> {
  const { data, error } = await client
    .from("packages")
    .select("*")
    .eq("ls_variant_id", variantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

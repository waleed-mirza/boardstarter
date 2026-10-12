import type { DatabaseClient, PackageRow } from "../types";
import { requireData } from "../types";
import { packageInputSchema, type PackageInput } from "@/lib/validation/admin";
import { callAdminMutation } from "./rpc";

export type AdminPackage = PackageRow & { jobsCount: number; ordersCount: number };

export async function listAdminPackages(client: DatabaseClient): Promise<AdminPackage[]> {
  const { data, error } = await client.from("packages").select("*").order("sort", { ascending: true });
  const packages = requireData(data, error) as PackageRow[];
  if (packages.length === 0) return [];
  const ids = packages.map((item) => item.id);
  const [jobs, orders] = await Promise.all([
    client.from("jobs").select("package_id").in("package_id", ids),
    client.from("orders").select("package_id").in("package_id", ids),
  ]);
  const jobRows = requireData(jobs.data, jobs.error) as Array<{ package_id: string | null }>;
  const orderRows = requireData(orders.data, orders.error) as Array<{ package_id: string | null }>;
  const count = (rows: Array<{ package_id: string | null }>) => {
    const result = new Map<string, number>();
    for (const row of rows) if (row.package_id) result.set(row.package_id, (result.get(row.package_id) ?? 0) + 1);
    return result;
  };
  const jobsByPackage = count(jobRows);
  const ordersByPackage = count(orderRows);
  return packages.map((item) => ({
    ...item,
    jobsCount: jobsByPackage.get(item.id) ?? 0,
    ordersCount: ordersByPackage.get(item.id) ?? 0,
  }));
}

export async function upsertAdminPackage(client: DatabaseClient, input: PackageInput) {
  const parsed = packageInputSchema.parse(input);
  const { data, error } = await client.rpc("admin_upsert_package", {
    p_id: parsed.id ?? null,
    p_name: parsed.name,
    p_price_cents: parsed.priceCents,
    p_currency: parsed.currency,
    p_duration_days: parsed.durationDays,
    p_is_featured: parsed.isFeatured,
    p_ls_variant_id: parsed.lsVariantId,
    p_is_active: parsed.isActive,
    p_sort: parsed.sort,
  });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

export async function deleteAdminPackage(client: DatabaseClient, id: string) {
  const { data, error } = await client.rpc("admin_delete_package", { p_id: id });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}


import type { AdminActionRow, DatabaseClient } from "../types";
import { requireData } from "../types";

export type AdminAction = AdminActionRow & { actorName: string | null; actorEmail: string | null };

export async function listRecentAdminActions(client: DatabaseClient, limit = 12): Promise<AdminAction[]> {
  const { data, error } = await client
    .from("admin_actions")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 50)));
  const rows = requireData(data, error) as Array<AdminActionRow & { profiles: { full_name: string | null } | null }>;
  return rows.map((row) => ({
    id: row.id,
    actor_id: row.actor_id,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    meta: row.meta,
    created_at: row.created_at,
    actorName: row.profiles?.full_name ?? null,
    actorEmail: null,
  }));
}


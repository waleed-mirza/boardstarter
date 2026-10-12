import { SubscribersTable } from "@/components/admin/admin-controls";
import { PageHeader } from "@/components/patterns/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { listAdminSubscribers } from "@/lib/data/admin/subscribers";
import { createClient } from "@/lib/supabase/server";

function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }

export default async function AdminSubscribersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/subscribers");
  const params = await searchParams;
  const page = Math.max(1, Number(first(params.page) ?? "1") || 1);
  const subscribers = await listAdminSubscribers(await createClient(), page);
  return <div className="grid gap-6"><PageHeader title="Subscribers" description="Review alert subscribers and download a portable CSV export." /><SubscribersTable subscribers={subscribers} /></div>;
}

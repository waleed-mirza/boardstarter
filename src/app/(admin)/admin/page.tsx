import { AdminStatsCards, RecentAdminActions, ReviewQueue, TopCategories } from "@/components/admin/admin-controls";
import { PageHeader } from "@/components/patterns/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { listRecentAdminActions } from "@/lib/data/admin/audit";
import { listModerationQueue } from "@/lib/data/admin/jobs";
import { getAdminStats } from "@/lib/data/admin/stats";
import { createClient } from "@/lib/supabase/server";

export default async function AdminQueuePage() {
  await requireAdmin("/admin");
  const client = await createClient();
  const [queue, stats, actions] = await Promise.all([
    listModerationQueue(client),
    getAdminStats(client),
    listRecentAdminActions(client),
  ]);
  return (
    <div className="grid gap-8">
      <PageHeader title="Review queue" description="New and edited listings waiting for a decision." />
      <AdminStatsCards stats={stats} />
      <section className="grid gap-3" aria-labelledby="pending-heading">
        <div><h2 id="pending-heading" className="text-base font-semibold">Pending review</h2><p className="mt-1 text-sm text-fg-muted">Approve paid listings, request changes, or open a preview.</p></div>
        <ReviewQueue jobs={queue} />
      </section>
      <div className="grid gap-6 xl:grid-cols-2"><TopCategories stats={stats} /><RecentAdminActions actions={actions} /></div>
    </div>
  );
}

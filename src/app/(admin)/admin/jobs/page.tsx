import { JobFilters, JobsTable } from "@/components/admin/admin-controls";
import { PageHeader } from "@/components/patterns/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { listAdminJobs } from "@/lib/data/admin/jobs";
import { adminJobFiltersSchema } from "@/lib/validation/admin";
import { createClient } from "@/lib/supabase/server";

function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/jobs");
  const params = await searchParams;
  const filters = adminJobFiltersSchema.parse({ query: first(params.query), status: first(params.status), page: first(params.page) });
  const result = await listAdminJobs(await createClient(), filters);
  return <div className="grid gap-6"><PageHeader title="Jobs" description="Search every listing and manage its published state." /><JobFilters query={filters.query} status={filters.status} /><JobsTable jobs={result.data} total={result.total} page={result.page} hasNext={result.hasNext} query={filters.query} status={filters.status} /></div>;
}

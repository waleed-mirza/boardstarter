import { PackagesManager } from "@/components/admin/admin-controls";
import { PageHeader } from "@/components/patterns/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { listAdminPackages } from "@/lib/data/admin/packages";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPackagesPage() {
  await requireAdmin("/admin/packages");
  const packages = await listAdminPackages(await createClient());
  return <div className="grid gap-6"><PageHeader title="Packages" description="Manage paid listing packages and their Lemon Squeezy variants." /><PackagesManager packages={packages} /></div>;
}

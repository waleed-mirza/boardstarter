import { TaxonomyManager } from "@/components/admin/admin-controls";
import { PageHeader } from "@/components/patterns/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { listAdminCategories, listAdminTags } from "@/lib/data/admin/taxonomy";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTaxonomyPage() {
  await requireAdmin("/admin/taxonomy");
  const client = await createClient();
  const [categories, tags] = await Promise.all([listAdminCategories(client), listAdminTags(client)]);
  return <div className="grid gap-6"><PageHeader title="Taxonomy" description="Keep categories and tags consistent as the board grows." /><TaxonomyManager categories={categories} tags={tags} /></div>;
}

import { SettingsForm } from "@/components/admin/admin-controls";
import { PageHeader } from "@/components/patterns/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminSiteSettings } from "@/lib/data/admin/settings";
import { toPublicSiteConfig } from "@/lib/data/settings";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage() {
  await requireAdmin("/admin/settings");
  const config = toPublicSiteConfig(await getAdminSiteSettings(await createClient()));
  return <div className="grid gap-6"><PageHeader title="Settings" description="Shape the board’s identity, publishing rules, and analytics connection." /><SettingsForm config={config} /></div>;
}

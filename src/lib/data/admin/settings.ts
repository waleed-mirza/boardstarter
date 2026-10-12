import type { Json } from "@/lib/supabase/types";
import type { DatabaseClient } from "../types";
import { getSiteSettings } from "../settings";
import type { SiteSettingsInput } from "@/lib/validation/admin";
import { callAdminMutation } from "./rpc";

export async function getAdminSiteSettings(client: DatabaseClient): Promise<Record<string, Json>> {
  return getSiteSettings(client);
}

export async function updateAdminSiteSettings(client: DatabaseClient, input: SiteSettingsInput) {
  const values: Record<string, Json> = {
    site_name: input.siteName,
    tagline: input.tagline,
    logo_url: input.logoUrl,
    accent: input.accent,
    preset: input.preset,
    default_currency: input.defaultCurrency,
    allowed_apply_modes: input.allowedApplyModes,
    auto_publish_on_payment: input.autoPublishOnPayment,
    alert_frequency: input.alertFrequency,
    pseo_min_live_jobs: input.pseoMinimumLiveJobs,
    footer_links: input.footerLinks,
    analytics_snippet: input.analyticsSnippet,
  };
  const { data, error } = await client.rpc("admin_update_site_settings", { p_settings: values });
  if (error) throw new Error(error.message);
  return callAdminMutation(client, data);
}

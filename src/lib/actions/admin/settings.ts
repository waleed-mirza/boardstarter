"use server";

import { runAdminAction } from "@/lib/actions/admin-utils";
import { fromZodError, type ActionResult } from "@/lib/actions/result";
import { updateAdminSiteSettings } from "@/lib/data/admin/settings";
import { siteSettingsSchema } from "@/lib/validation/admin";

export async function updateSiteSettings(input: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/settings");
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/settings", ["site-settings", "jobs", "admin-actions"], async (client) => {
    return (await updateAdminSiteSettings(client, parsed.data)) as Record<string, unknown>;
  });
}


"use server";

import { runAdminAction } from "@/lib/actions/admin-utils";
import { fromZodError, type ActionResult } from "@/lib/actions/result";
import { deleteAdminPackage, upsertAdminPackage } from "@/lib/data/admin/packages";
import { packageInputSchema } from "@/lib/validation/admin";

export async function savePackage(input: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/packages");
  const parsed = packageInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/packages", ["packages", "admin-actions"], async (client) => {
    return (await upsertAdminPackage(client, parsed.data)) as Record<string, unknown>;
  });
}

export async function deletePackage(id: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/packages");
  const parsed = (await import("@/lib/validation/admin")).jobIdSchema.safeParse({ jobId: id });
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/packages", ["packages", "admin-actions"], async (client) => {
    return (await deleteAdminPackage(client, parsed.data.jobId)) as Record<string, unknown>;
  });
}


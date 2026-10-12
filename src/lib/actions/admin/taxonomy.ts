"use server";

import { runAdminAction } from "@/lib/actions/admin-utils";
import { fromZodError, type ActionResult } from "@/lib/actions/result";
import {
  deleteAdminCategory,
  deleteAdminTag,
  mergeAdminCategory,
  mergeAdminTag,
  upsertAdminCategory,
  upsertAdminTag,
} from "@/lib/data/admin/taxonomy";
import { taxonomyCategorySchema, taxonomyDeleteSchema, taxonomyMergeSchema, taxonomyTagSchema } from "@/lib/validation/admin";

export async function saveCategory(input: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/taxonomy");
  const parsed = taxonomyCategorySchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/taxonomy", ["jobs", "taxonomy", "stats", "admin-actions"], async (client) => {
    return (await upsertAdminCategory(client, parsed.data)) as Record<string, unknown>;
  });
}

export async function mergeCategory(sourceId: unknown, targetId: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/taxonomy");
  const parsed = taxonomyMergeSchema.safeParse({ sourceId, targetId });
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/taxonomy", ["jobs", "taxonomy", "stats", "admin-actions"], async (client) => {
    return (await mergeAdminCategory(client, parsed.data.sourceId, parsed.data.targetId)) as Record<string, unknown>;
  });
}

export async function deleteCategory(id: unknown, reassignTo: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/taxonomy");
  const parsed = taxonomyDeleteSchema.safeParse({ id, reassignTo: reassignTo || null });
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/taxonomy", ["jobs", "taxonomy", "stats", "admin-actions"], async (client) => {
    return (await deleteAdminCategory(client, parsed.data.id, parsed.data.reassignTo ?? null)) as Record<string, unknown>;
  });
}

export async function saveTag(input: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/taxonomy");
  const parsed = taxonomyTagSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/taxonomy", ["jobs", "taxonomy", "stats", "admin-actions"], async (client) => {
    return (await upsertAdminTag(client, parsed.data)) as Record<string, unknown>;
  });
}

export async function mergeTag(sourceId: unknown, targetId: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/taxonomy");
  const parsed = taxonomyMergeSchema.safeParse({ sourceId, targetId });
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/taxonomy", ["jobs", "taxonomy", "stats", "admin-actions"], async (client) => {
    return (await mergeAdminTag(client, parsed.data.sourceId, parsed.data.targetId)) as Record<string, unknown>;
  });
}

export async function deleteTag(id: unknown, reassignTo: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin/taxonomy");
  const parsed = taxonomyDeleteSchema.safeParse({ id, reassignTo: reassignTo || null });
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction("/admin/taxonomy", ["jobs", "taxonomy", "stats", "admin-actions"], async (client) => {
    return (await deleteAdminTag(client, parsed.data.id, parsed.data.reassignTo ?? null)) as Record<string, unknown>;
  });
}


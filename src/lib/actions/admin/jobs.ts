"use server";

import { runAdminAction } from "@/lib/actions/admin-utils";
import { fromZodError, type ActionResult } from "@/lib/actions/result";
import {
  approveAdminJob,
  deleteAdminJob,
  extendAdminJob,
  forceExpireAdminJob,
  rejectAdminJob,
  setAdminJobFeatured,
} from "@/lib/data/admin/jobs";
import {
  jobExtensionSchema,
  jobFeaturedSchema,
  jobIdSchema,
  jobRejectionSchema,
} from "@/lib/validation/admin";
import { getJobSlugForIndexing } from "@/lib/data/seo";
import { submitGoogleIndexingBestEffort } from "@/lib/seo/indexing";
import type { DatabaseClient } from "@/lib/data/types";

async function notifyIndexing(
  client: DatabaseClient,
  jobId: string,
  type: "URL_UPDATED" | "URL_DELETED",
): Promise<void> {
  try {
    const slug = await getJobSlugForIndexing(client, jobId);
    if (slug) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const jobUrl = new URL(`/jobs/${slug}`, siteUrl).toString();
      await submitGoogleIndexingBestEffort(jobUrl, type);
    }
  } catch (error) {
    console.warn(
      JSON.stringify({
        scope: "google_indexing",
        type,
        result: "lookup_error",
        message: error instanceof Error ? error.message : "lookup failed",
      }),
    );
  }
}

export async function approveJob(jobId: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const auth = await import("@/lib/auth/guards");
  await auth.requireAdmin("/admin");
  const parsed = jobIdSchema.safeParse({ jobId });
  if (!parsed.success) return fromZodError(parsed.error);
  return runAdminAction(
    "/admin",
    ["jobs", `job-${parsed.data.jobId}`, "stats", "admin-actions"],
    async (client) => {
      const result = (await approveAdminJob(client, parsed.data.jobId)) as Record<string, unknown>;
      if (result.status === "published")
        await notifyIndexing(client, parsed.data.jobId, "URL_UPDATED");
      return result;
    },
  );
}

export async function rejectJob(
  jobId: unknown,
  reason: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = jobRejectionSchema.safeParse({ jobId, reason });
  if (!parsed.success) {
    const auth = await import("@/lib/auth/guards");
    await auth.requireAdmin("/admin");
    return fromZodError(parsed.error);
  }
  return runAdminAction(
    "/admin",
    ["jobs", `job-${parsed.data.jobId}`, "stats", "admin-actions"],
    async (client) => {
      return (await rejectAdminJob(client, parsed.data.jobId, parsed.data.reason)) as Record<
        string,
        unknown
      >;
    },
  );
}

export async function setJobFeatured(
  jobId: unknown,
  featured: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = jobFeaturedSchema.safeParse({ jobId, featured });
  if (!parsed.success) {
    const auth = await import("@/lib/auth/guards");
    await auth.requireAdmin("/admin");
    return fromZodError(parsed.error);
  }
  return runAdminAction(
    "/admin",
    ["jobs", `job-${parsed.data.jobId}`, "stats", "admin-actions"],
    async (client) => {
      return (await setAdminJobFeatured(client, parsed.data.jobId, parsed.data.featured)) as Record<
        string,
        unknown
      >;
    },
  );
}

export async function extendJob(
  jobId: unknown,
  days: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = jobExtensionSchema.safeParse({ jobId, days });
  if (!parsed.success) {
    const auth = await import("@/lib/auth/guards");
    await auth.requireAdmin("/admin");
    return fromZodError(parsed.error);
  }
  return runAdminAction(
    "/admin/jobs",
    ["jobs", `job-${parsed.data.jobId}`, "stats", "admin-actions"],
    async (client) => {
      return (await extendAdminJob(client, parsed.data.jobId, parsed.data.days)) as Record<
        string,
        unknown
      >;
    },
  );
}

export async function forceExpireJob(
  jobId: unknown,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = jobIdSchema.safeParse({ jobId });
  if (!parsed.success) {
    const auth = await import("@/lib/auth/guards");
    await auth.requireAdmin("/admin");
    return fromZodError(parsed.error);
  }
  return runAdminAction(
    "/admin/jobs",
    ["jobs", `job-${parsed.data.jobId}`, "stats", "admin-actions"],
    async (client) => {
      const result = (await forceExpireAdminJob(client, parsed.data.jobId)) as Record<
        string,
        unknown
      >;
      if (result.status === "expired")
        await notifyIndexing(client, parsed.data.jobId, "URL_DELETED");
      return result;
    },
  );
}

export async function deleteJob(jobId: unknown): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = jobIdSchema.safeParse({ jobId });
  if (!parsed.success) {
    const auth = await import("@/lib/auth/guards");
    await auth.requireAdmin("/admin/jobs");
    return fromZodError(parsed.error);
  }
  return runAdminAction("/admin/jobs", ["jobs", "stats", "admin-actions"], async (client) => {
    return (await deleteAdminJob(client, parsed.data.jobId)) as Record<string, unknown>;
  });
}

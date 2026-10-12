"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import {
  closeEmployerJob,
  createDraft,
  getEmployerJob,
  updateEmployerJob,
  type EmployerJobWrite,
} from "@/lib/data/jobs";
import { createClient } from "@/lib/supabase/server";
import { jobSchema } from "@/lib/validation/job";
import { getPublicSiteConfig } from "@/lib/data/settings";

import { fail, fromZodError, ok, type ActionResult } from "./result";

function writeInput(input: unknown): EmployerJobWrite | ActionResult<never> {
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return parsed.data;
}

function isWriteInput(value: EmployerJobWrite | ActionResult<never>): value is EmployerJobWrite {
  return !("ok" in value);
}

/** Creates only a draft; publishing is performed by the payment/admin workflows. */
export async function postJob(input: unknown): Promise<ActionResult<{ jobId: string }>> {
  const user = await requireRole("employer", "/dashboard/post");
  const companyId = user.companyId;
  if (!companyId) return fail("Complete your company profile before posting a job.");

  const parsed = writeInput(input);
  if (!isWriteInput(parsed)) return parsed;

  const client = await createClient();
  try {
    const siteConfig = await getPublicSiteConfig(client);
    if (!siteConfig.allowedApplyModes.includes(parsed.applyMode)) {
      return fail("That application method is not currently enabled.", "applyMode");
    }
    const job = await createDraft(client, companyId, parsed);
    updateTag(`company-${companyId}`);
    return ok({ jobId: job.id });
  } catch {
    return fail("Could not save the job draft.");
  }
}

export async function updateJob(
  jobId: string,
  input: unknown,
): Promise<ActionResult<{ jobId: string }>> {
  const user = await requireRole("employer", `/dashboard/jobs/${jobId}/edit`);
  const companyId = user.companyId;
  if (!companyId) return fail("Complete your company profile before posting a job.");

  const parsed = writeInput(input);
  if (!isWriteInput(parsed)) return parsed;

  const client = await createClient();
  try {
    const siteConfig = await getPublicSiteConfig(client);
    if (!siteConfig.allowedApplyModes.includes(parsed.applyMode)) {
      return fail("That application method is not currently enabled.", "applyMode");
    }
    const ownedJob = await getEmployerJob(client, companyId, jobId);
    if (!ownedJob) return fail("Job not found.");
    await updateEmployerJob(client, companyId, jobId, parsed);
    updateTag("jobs");
    updateTag(`job-${jobId}`);
    updateTag(`company-${companyId}`);
    return ok({ jobId });
  } catch {
    return fail("Could not save the job.");
  }
}

export async function closeJob(jobId: string): Promise<ActionResult<{ jobId: string }>> {
  const user = await requireRole("employer", "/dashboard");
  const companyId = user.companyId;
  if (!companyId) return fail("Complete your company profile before managing jobs.");
  if (!z.uuid().safeParse(jobId).success) return fail("Job not found.");

  const client = await createClient();
  try {
    const ownedJob = await getEmployerJob(client, companyId, jobId);
    if (!ownedJob) return fail("Job not found.");
    const closed = await closeEmployerJob(client, jobId);
    if (!closed) return fail("Job is already closed.");
    updateTag("jobs");
    updateTag(`job-${jobId}`);
    updateTag(`company-${companyId}`);
    return ok({ jobId });
  } catch {
    return fail("Could not close the job.");
  }
}

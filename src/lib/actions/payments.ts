"use server";

import { requireRole } from "@/lib/auth/guards";
import { getLatestEmployerOrder, type EmployerOrder } from "@/lib/data/orders";
import { getPackageById } from "@/lib/data/packages";
import { getEmployerJob } from "@/lib/data/jobs";
import { getPaymentProvider } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { checkoutSelectionSchema } from "@/lib/validation/payment";

import { fail, fromZodError, ok, type ActionResult } from "./result";

export async function createCheckout(
  jobId: unknown,
  packageId: unknown,
): Promise<ActionResult<{ url: string }>> {
  const parsed = checkoutSelectionSchema.safeParse({ jobId, packageId });
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await requireRole("employer", `/dashboard/billing?jobId=${parsed.data.jobId}`);
  if (!user.companyId) return fail("Complete your company profile before paying for a job.");

  const client = await createClient();
  try {
    const [job, selectedPackage] = await Promise.all([
      getEmployerJob(client, user.companyId, parsed.data.jobId),
      getPackageById(client, parsed.data.packageId),
    ]);
    if (!job) return fail("Job not found.");
    if (!selectedPackage?.is_active) return fail("That package is no longer available.");

    const provider = getPaymentProvider();
    const redirectUrl = new URL(
      `/dashboard/billing/success?jobId=${encodeURIComponent(job.id)}&checkout=1`,
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ).toString();
    const checkout = await provider.createCheckout({
      jobId: job.id,
      packageId: selectedPackage.id,
      providerVariantId: selectedPackage.ls_variant_id,
      email: user.email,
      redirectUrl,
    });
    return ok(checkout);
  } catch {
    return fail("Could not start checkout. Please try again.");
  }
}

export async function latestPaymentOrder(jobId: string): Promise<EmployerOrder | null> {
  const user = await requireRole("employer", `/dashboard/billing?jobId=${jobId}`);
  if (!user.companyId) return null;
  return getLatestEmployerOrder(await createClient(), user.companyId, jobId);
}

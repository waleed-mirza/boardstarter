"use server";

import { updateTag } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { uploadCompanyLogo } from "@/lib/data/company-logos";
import { createClient } from "@/lib/supabase/server";
import { validateCompanyLogoFile } from "@/lib/uploads/company-logo";

import { fail, ok, type ActionResult } from "./result";

export async function uploadCompanyLogoAction(
  formData: FormData,
): Promise<ActionResult<{ logoUrl: string }>> {
  const user = await requireRole("employer", "/dashboard/settings");
  if (!user.companyId) return fail("Complete your company profile before uploading a logo.");

  const value = formData.get("file");
  if (!(value instanceof File)) return fail("Choose a logo image.", "file");

  let metadata;
  try {
    metadata = await validateCompanyLogoFile(value);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Upload a valid logo image.", "file");
  }

  try {
    const logoUrl = await uploadCompanyLogo(
      await createClient(),
      user.id,
      user.companyId,
      value,
      metadata,
    );
    updateTag("jobs");
    updateTag(`company-${user.companyId}`);
    return ok({ logoUrl });
  } catch {
    return fail("Could not upload the company logo.");
  }
}

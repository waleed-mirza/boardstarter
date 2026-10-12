"use server";

import { z } from "zod";

import { revalidatePath } from "next/cache";

import { updateCompany } from "@/lib/data/companies";
import { updateProfile } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { companySchema, profileUpdateSchema } from "@/lib/validation/auth";

export type AccountActionState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Guards own the identity; the action re-checks instead of taking an id. */
export async function updateProfileAction(input: unknown): Promise<AccountActionState> {
  const user = await requireUser("/dashboard/settings");
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  try {
    await updateProfile(supabase, user.id, { full_name: parsed.data.fullName });
  } catch (error) {
    console.warn("profile_update_failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false, error: "Could not save your profile. Please try again." };
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateCompanyAction(input: unknown): Promise<AccountActionState> {
  const user = await requireUser("/dashboard/settings");
  if (!user.companyId) return { ok: false, error: "No company linked to this profile yet." };

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors below.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  try {
    await updateCompany(supabase, user.companyId, parsed.data);
  } catch (error) {
    console.warn("company_update_failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false, error: "Could not save your company details. Please try again." };
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors;
}

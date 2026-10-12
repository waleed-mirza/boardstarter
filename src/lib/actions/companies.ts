"use server";

import { z } from "zod";

import { revalidatePath } from "next/cache";

import { createCompanyForProfile } from "@/lib/data/companies";
import { createClient } from "@/lib/supabase/server";
import { companySchema } from "@/lib/validation/auth";

export type CompanyActionState =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Onboarding submit: create the company and link it to the signed-in user. */
export async function createCompanyAction(input: unknown): Promise<CompanyActionState> {
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const supabase = await createClient();
  try {
    await createCompanyForProfile(supabase, parsed.data);
  } catch (error) {
    console.warn("company_create_failed", error instanceof Error ? error.message : "unknown error");
    return {
      ok: false,
      error: "Could not create the company. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

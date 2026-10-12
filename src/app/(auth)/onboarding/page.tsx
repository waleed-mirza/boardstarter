import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CompanyForm } from "@/components/auth/company-form";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Create your company",
  robots: { index: false },
};

/** Onboarding: the first stop for a signed-in employer with no company. */
export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  if (user.companyId) redirect("/dashboard");

  return (
    <>
      <h1 className="sr-only">Create your company</h1>
      <CompanyForm />
    </>
  );
}

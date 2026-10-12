import type { Metadata } from "next";

import { JobForm } from "@/components/employer/job-form";
import { PageHeader } from "@/components/patterns/page-header";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyById } from "@/lib/data/companies";
import { listActivePackages } from "@/lib/data/packages";
import { listCategories, listTags } from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/server";
import { getPublicSiteConfig } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Post a job",
  robots: { index: false },
};

export default async function PostJobPage() {
  const user = await requireRole("employer", "/dashboard/post");
  if (!user.companyId) return null;
  const client = await createClient();
  const [company, categories, tags, packages, siteConfig] = await Promise.all([
    getCompanyById(client, user.companyId),
    listCategories(client),
    listTags(client),
    listActivePackages(client),
    getPublicSiteConfig(client),
  ]);
  if (!company) return null;

  return (
    <>
      <PageHeader
        title="Post a job"
        description="Create a draft listing for review. You can edit it any time before publishing."
      />
      <JobForm
        userId={user.id}
        company={company}
        categories={categories}
        tags={tags}
        packages={packages}
        mode="create"
        allowedApplyModes={siteConfig.allowedApplyModes}
      />
    </>
  );
}

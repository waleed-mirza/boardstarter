import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JobForm } from "@/components/employer/job-form";
import { PageHeader } from "@/components/patterns/page-header";
import { requireRole } from "@/lib/auth/guards";
import { getCompanyById } from "@/lib/data/companies";
import { getEmployerJob } from "@/lib/data/jobs";
import { listCategories, listTags } from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/server";
import { getPublicSiteConfig } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Edit job",
  robots: { index: false },
};

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("employer", `/dashboard/jobs/${id}/edit`);
  if (!user.companyId) return null;

  const client = await createClient();
  const [company, job, categories, tags, siteConfig] = await Promise.all([
    getCompanyById(client, user.companyId),
    getEmployerJob(client, user.companyId, id),
    listCategories(client),
    listTags(client),
    getPublicSiteConfig(client),
  ]);
  if (!company || !job) notFound();

  return (
    <>
      <PageHeader title="Edit job" description="Update your draft or make changes to an existing listing." />
      <JobForm userId={user.id} company={company} categories={categories} tags={tags} job={job} mode="edit" allowedApplyModes={siteConfig.allowedApplyModes} />
    </>
  );
}

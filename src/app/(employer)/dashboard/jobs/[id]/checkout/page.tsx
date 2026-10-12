import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutForm } from "@/components/employer/checkout-form";
import { PageHeader } from "@/components/patterns/page-header";
import { requireRole } from "@/lib/auth/guards";
import { getEmployerJob } from "@/lib/data/jobs";
import { listActivePackages } from "@/lib/data/packages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Renew listing",
  robots: { index: false },
};

export default async function JobCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("employer", `/dashboard/jobs/${id}/checkout`);
  if (!user.companyId) return null;
  const client = await createClient();
  const [job, packages] = await Promise.all([
    getEmployerJob(client, user.companyId, id),
    listActivePackages(client),
  ]);
  if (!job) notFound();

  return (
    <>
      <PageHeader
        title={`Renew ${job.title}`}
        description="Choose a package to extend this listing."
      />
      <div className="max-w-2xl">
        <CheckoutForm jobId={job.id} packages={packages} submitLabel="Renew listing" />
      </div>
    </>
  );
}

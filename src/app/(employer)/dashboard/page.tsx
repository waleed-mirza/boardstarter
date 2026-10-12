import Link from "next/link";
import { BriefcaseIcon, PlusIcon } from "lucide-react";

import { EmployerJobTable } from "@/components/employer/employer-job-table";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { getEmployerJobs } from "@/lib/data/jobs";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await requireRole("employer", "/dashboard");
  if (!user.companyId) return null;
  const jobs = await getEmployerJobs(await createClient(), user.companyId);

  return (
    <>
      <PageHeader
        title="Your jobs"
        description="Manage listings, renewals, and applications."
        actions={<Button asChild><Link href="/dashboard/post"><PlusIcon aria-hidden />Post a Job</Link></Button>}
      />
      {jobs.length > 0 ? (
        <EmployerJobTable jobs={jobs} />
      ) : (
        <EmptyState
          icon={BriefcaseIcon}
          title="No jobs yet — post your first one."
          description="Your listing appears on the board after review."
          action={<Button asChild><Link href="/dashboard/post">Post a Job</Link></Button>}
        />
      )}
    </>
  );
}

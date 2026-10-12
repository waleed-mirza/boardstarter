import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { PaymentStatus } from "@/components/employer/payment-status";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { getEmployerPaymentState } from "@/lib/data/orders";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Payment status",
  robots: { index: false },
};

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string | string[]; checkout?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedJobId = Array.isArray(query.jobId) ? query.jobId[0] : query.jobId;
  const jobId = z.uuid().safeParse(requestedJobId).success ? requestedJobId : undefined;
  const checkout = Array.isArray(query.checkout) ? query.checkout[0] : query.checkout;
  const user = await requireRole(
    "employer",
    `/dashboard/billing/success${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ""}`,
  );
  if (!user.companyId || !jobId) {
    return (
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    );
  }
  const state = await getEmployerPaymentState(await createClient(), user.companyId, jobId);
  if (!state) {
    return (
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    );
  }

  let status:
    "awaiting_payment" | "processing" | "published" | "pending_review" | "disputed" | "refunded";
  if (state.order?.status === "refunded") {
    status = "refunded";
  } else if (state.order?.status === "disputed") {
    status = "disputed";
  } else if (state.job.status === "published") {
    status = "published";
  } else if (state.job.status === "pending_review") {
    status = "pending_review";
  } else if (state.order?.status === "paid" || checkout === "1") {
    status = "processing";
  } else {
    status = "awaiting_payment";
  }

  return <PaymentStatus jobId={state.job.id} slug={state.job.slug} status={status} />;
}

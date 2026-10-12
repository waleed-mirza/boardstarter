import type { Metadata } from "next";
import Link from "next/link";
import { CreditCardIcon } from "lucide-react";
import { z } from "zod";

import { CheckoutForm } from "@/components/employer/checkout-form";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { listEmployerOrders } from "@/lib/data/orders";
import { listActivePackages } from "@/lib/data/packages";
import { getEmployerJob } from "@/lib/data/jobs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false },
};

function amount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(cents / 100);
}

function orderStatus(status: string): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "refunded":
      return "Refunded";
    case "disputed":
      return "Needs review";
    default:
      return status;
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string | string[] }>;
}) {
  const user = await requireRole("employer", "/dashboard/billing");
  if (!user.companyId) return null;
  const query = await searchParams;
  const requestedJobId = Array.isArray(query.jobId) ? query.jobId[0] : query.jobId;
  const jobId = z.uuid().safeParse(requestedJobId).success ? requestedJobId : undefined;
  const client = await createClient();
  const [packages, orders, job] = await Promise.all([
    listActivePackages(client),
    listEmployerOrders(client, user.companyId),
    jobId ? getEmployerJob(client, user.companyId, jobId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        title="Billing"
        description="Choose a package to publish a draft or renew an existing listing."
      />
      {requestedJobId && !job ? (
        <EmptyState
          icon={CreditCardIcon}
          title="Job not found"
          description="This job is not part of your employer account."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      ) : null}
      {job ? (
        <section className="mb-8 flex max-w-2xl flex-col gap-4" aria-labelledby="choose-package">
          <div>
            <h2 id="choose-package" className="text-xl font-semibold tracking-tight">
              {job.status === "expired" ? "Renew" : "Publish"}: {job.title}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              The package and expiry are read from the server when payment is confirmed.
            </p>
          </div>
          <CheckoutForm
            jobId={job.id}
            packages={packages}
            submitLabel={job.status === "expired" ? "Renew listing" : "Continue to checkout"}
          />
        </section>
      ) : null}
      {orders.length > 0 ? (
        <section className="flex max-w-3xl flex-col gap-3" aria-labelledby="payment-history">
          <h2 id="payment-history" className="text-xl font-semibold tracking-tight">
            Payment history
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg-muted text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Order
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-mono text-xs">{order.provider_order_id}</td>
                    <td className="px-4 py-3 tabular">
                      {amount(order.amount_cents, order.currency)}
                    </td>
                    <td className="px-4 py-3">{orderStatus(order.status)}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                        new Date(order.created_at),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : !job ? (
        <EmptyState
          icon={CreditCardIcon}
          title="No payments yet"
          description="Save a draft, then return here to choose a listing package."
          action={
            <Button asChild>
              <Link href="/dashboard/post">Post a job</Link>
            </Button>
          }
        />
      ) : null}
    </>
  );
}

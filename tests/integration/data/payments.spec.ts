import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { processPaidOrder, processRefundedOrder } from "@/lib/data/orders";
import { adminClient, type TestClient } from "../helpers/supabase";

async function createFixtureJob(
  client: TestClient,
  slug: string,
): Promise<{
  id: string;
  packageId: string;
  variantId: string;
  original: {
    status: "draft" | "pending_review" | "published" | "rejected" | "expired";
    package_id: string | null;
    is_featured: boolean;
    featured_until: string | null;
    published_at: string | null;
    expires_at: string | null;
  };
}> {
  const { data: packageRow, error: packageError } = await client
    .from("packages")
    .select("id, ls_variant_id")
    .eq("ls_variant_id", "standard-listing-30")
    .single();
  if (packageError) throw new Error(packageError.message);
  if (!packageRow) throw new Error("Seed package is required");

  const { data: job, error } = await client
    .from("jobs")
    .select("id, status, package_id, is_featured, featured_until, published_at, expires_at")
    .eq("slug", slug)
    .single();
  if (error) throw new Error(error.message);
  if (!job) throw new Error(`Seed job ${slug} is required`);
  return {
    id: job.id,
    packageId: packageRow.id,
    variantId: packageRow.ls_variant_id,
    original: {
      status: job.status,
      package_id: job.package_id,
      is_featured: job.is_featured,
      featured_until: job.featured_until,
      published_at: job.published_at,
      expires_at: job.expires_at,
    },
  };
}

async function removeFixtureJob(
  client: TestClient,
  fixture: Awaited<ReturnType<typeof createFixtureJob>>,
): Promise<void> {
  const jobId = fixture.id;
  await client.from("payment_webhook_events").delete().eq("job_id", jobId);
  await client.from("orders").delete().eq("job_id", jobId);
  const { error } = await client.from("jobs").update(fixture.original).eq("id", fixture.id);
  if (error) throw new Error(error.message);
}

function paidEvent(jobId: string, packageId: string, variantId: string, orderId: string) {
  return {
    type: "order_paid" as const,
    jobId,
    packageId,
    providerVariantId: variantId,
    orderId,
    providerCustomerId: "integration-customer",
    amountCents: 4900,
    currency: "USD",
    raw: { source: "integration" as const },
  };
}

describe("payment transition concurrency", () => {
  it("processes ten identical paid deliveries into one order and one publish", async () => {
    const client = adminClient();
    const fixture = await createFixtureJob(client, "senior-react-engineer-orchard");
    const orderId = `integration-concurrent-${randomUUID()}`;
    try {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          processPaidOrder(
            client,
            paidEvent(fixture.id, fixture.packageId, fixture.variantId, orderId),
          ),
        ),
      );
      expect(results.filter((result) => result.result === "processed")).toHaveLength(1);
      expect(results.filter((result) => result.result === "duplicate")).toHaveLength(9);

      const [{ data: orders, error: orderError }, { data: job, error: jobError }] =
        await Promise.all([
          client.from("orders").select("id").eq("provider_order_id", orderId),
          client
            .from("jobs")
            .select("status, package_id, expires_at")
            .eq("id", fixture.id)
            .single(),
        ]);
      expect(orderError).toBeNull();
      expect(jobError).toBeNull();
      expect(orders).toHaveLength(1);
      expect(job).toMatchObject({ status: "published", package_id: fixture.packageId });
      expect(job?.expires_at).toBeTruthy();
    } finally {
      await removeFixtureJob(client, fixture);
    }
  });

  it("keeps a refund tombstone when the refund arrives before payment", async () => {
    const client = adminClient();
    const fixture = await createFixtureJob(client, "product-design-intern");
    const orderId = `integration-refund-first-${randomUUID()}`;
    try {
      await expect(
        processRefundedOrder(client, {
          type: "order_refunded",
          orderId,
          jobId: fixture.id,
          raw: { source: "integration", refund_first: true },
        }),
      ).resolves.toMatchObject({ result: "deferred" });

      await expect(
        processPaidOrder(
          client,
          paidEvent(fixture.id, fixture.packageId, fixture.variantId, orderId),
        ),
      ).resolves.toMatchObject({ result: "refunded_before_paid" });

      const [{ data: order, error: orderError }, { data: job, error: jobError }] =
        await Promise.all([
          client.from("orders").select("status").eq("provider_order_id", orderId).single(),
          client.from("jobs").select("status").eq("id", fixture.id).single(),
        ]);
      expect(orderError).toBeNull();
      expect(jobError).toBeNull();
      expect(order?.status).toBe("refunded");
      expect(job?.status).toBe("expired");
    } finally {
      await removeFixtureJob(client, fixture);
    }
  });
});

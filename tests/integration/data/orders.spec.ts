import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { getCompanyBySlug } from "@/lib/data/companies";
import {
  getEmployerPaymentState,
  getLatestEmployerOrder,
  listEmployerOrders,
} from "@/lib/data/orders";

import { adminClient, authenticatedClient } from "../helpers/supabase";

describe("employer payment data", () => {
  it("lists safe order summaries and the latest payment state for an owner", async () => {
    const admin = adminClient();
    const client = await authenticatedClient("employer-a@example.test");
    const company = await getCompanyBySlug(client, "northstar-labs");
    expect(company).not.toBeNull();
    if (!company) return;
    const { data: job, error: jobError } = await admin
      .from("jobs")
      .select("id, slug, status, expires_at")
      .eq("slug", "qa-automation-engineer")
      .single();
    expect(jobError).toBeNull();
    if (!job) return;

    const providerOrderId = `integration-summary-${randomUUID()}`;
    const { data: inserted, error: insertError } = await admin
      .from("orders")
      .insert({
        job_id: job.id,
        provider: "lemonsqueezy",
        provider_order_id: providerOrderId,
        provider_customer_id: "private-customer-id",
        amount_cents: 4900,
        currency: "USD",
        status: "paid",
        raw: { private: "payload" },
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();
    if (!inserted) return;

    try {
      await expect(listEmployerOrders(client, company.id)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: inserted.id,
            provider_order_id: providerOrderId,
            amount_cents: 4900,
          }),
        ]),
      );
      const latest = await getLatestEmployerOrder(client, company.id, job.id);
      expect(latest).toMatchObject({ id: inserted.id, status: "paid" });
      expect(latest).not.toHaveProperty("raw");
      await expect(getEmployerPaymentState(client, company.id, job.id)).resolves.toMatchObject({
        job: { id: job.id, slug: job.slug },
        order: { id: inserted.id },
      });
      await expect(
        getLatestEmployerOrder(client, company.id, "00000000-0000-0000-0000-000000000000"),
      ).resolves.toBeNull();
      await expect(
        getEmployerPaymentState(client, company.id, "00000000-0000-0000-0000-000000000000"),
      ).resolves.toBeNull();
    } finally {
      await admin.from("orders").delete().eq("id", inserted.id);
    }
  });
});

import type { Json } from "@/lib/supabase/types";

import type { WebhookEvent } from "@/lib/payments/types";

import type { DatabaseClient, JobRow, OrderRow } from "./types";

export type EmployerOrder = Pick<
  OrderRow,
  | "id"
  | "job_id"
  | "provider"
  | "provider_order_id"
  | "amount_cents"
  | "currency"
  | "status"
  | "created_at"
>;

const EMPLOYER_ORDER_COLUMNS =
  "id, job_id, provider, provider_order_id, amount_cents, currency, status, created_at";

export type PaymentProcessResult = {
  result: string;
  job_id?: string;
  order_id?: string;
  expires_at?: string;
  status?: string;
  expected_amount_cents?: number;
  received_amount_cents?: number;
};

function asResult(value: Json | null): PaymentProcessResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Payment RPC returned an invalid result");
  }
  const record = value as Record<string, Json>;
  const result = record.result;
  if (typeof result !== "string") throw new Error("Payment RPC returned no result");
  return {
    result,
    job_id: typeof record.job_id === "string" ? record.job_id : undefined,
    order_id: typeof record.order_id === "string" ? record.order_id : undefined,
    expires_at: typeof record.expires_at === "string" ? record.expires_at : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    expected_amount_cents:
      typeof record.expected_amount_cents === "number" ? record.expected_amount_cents : undefined,
    received_amount_cents:
      typeof record.received_amount_cents === "number" ? record.received_amount_cents : undefined,
  };
}

export async function listEmployerOrders(
  client: DatabaseClient,
  companyId: string,
): Promise<EmployerOrder[]> {
  const { data: jobs, error: jobsError } = await client
    .from("jobs")
    .select("id")
    .eq("company_id", companyId);
  if (jobsError) throw new Error(jobsError.message);
  const jobIds = (jobs ?? []).map((job) => job.id);
  if (jobIds.length === 0) return [];
  const { data, error } = await client
    .from("orders")
    .select(EMPLOYER_ORDER_COLUMNS)
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLatestEmployerOrder(
  client: DatabaseClient,
  companyId: string,
  jobId: string,
): Promise<EmployerOrder | null> {
  const { data: job, error: jobError } = await client
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message);
  if (!job) return null;
  const { data, error } = await client
    .from("orders")
    .select(EMPLOYER_ORDER_COLUMNS)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getEmployerPaymentState(
  client: DatabaseClient,
  companyId: string,
  jobId: string,
): Promise<{
  job: Pick<JobRow, "id" | "slug" | "status" | "expires_at">;
  order: EmployerOrder | null;
} | null> {
  const { data: job, error: jobError } = await client
    .from("jobs")
    .select("id, slug, status, expires_at")
    .eq("id", jobId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message);
  if (!job) return null;
  return {
    job,
    order: await getLatestEmployerOrder(client, companyId, jobId),
  };
}

export async function processPaidOrder(
  client: DatabaseClient,
  event: Extract<WebhookEvent, { type: "order_paid" }>,
  provider = "lemonsqueezy",
): Promise<PaymentProcessResult> {
  const { data, error } = await client.rpc("process_paid_order", {
    p_provider: provider,
    p_job_id: event.jobId,
    p_provider_order_id: event.orderId,
    p_provider_customer_id: event.providerCustomerId ?? null,
    p_package_id: event.packageId ?? null,
    p_provider_variant_id: event.providerVariantId ?? null,
    p_amount_cents: event.amountCents,
    p_currency: event.currency,
    p_raw: event.raw,
  });
  if (error) throw new Error(error.message);
  return asResult(data);
}

export async function processRefundedOrder(
  client: DatabaseClient,
  event: Extract<WebhookEvent, { type: "order_refunded" }>,
  provider = "lemonsqueezy",
): Promise<PaymentProcessResult> {
  const { data, error } = await client.rpc("process_refunded_order", {
    p_provider: provider,
    p_provider_order_id: event.orderId,
    p_job_id: event.jobId ?? null,
    p_raw: event.raw,
  });
  if (error) throw new Error(error.message);
  return asResult(data);
}

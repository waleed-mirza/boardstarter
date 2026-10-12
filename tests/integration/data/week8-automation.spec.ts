import { beforeEach, describe, expect, it, vi } from "vitest";

const { cacheLifeMock, cacheTagMock, createPublicClientMock, fromMock, rpcMock } = vi.hoisted(() => ({
  cacheLifeMock: vi.fn(),
  cacheTagMock: vi.fn(),
  createPublicClientMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ cacheLife: cacheLifeMock, cacheTag: cacheTagMock }));
vi.mock("@/lib/supabase/server", () => ({ createPublicClient: createPublicClientMock }));

import { expireDueJobs, keepSupabaseAlive } from "@/lib/data/automation";
import {
  claimEmailQueue,
  enqueueDueDigests,
  enqueueRenewalNudges,
  markEmailFailed,
  markEmailSent,
} from "@/lib/data/email-queue";
import {
  getJobSlugForIndexing,
  getPublicSeoCatalog,
  findPseoTarget,
  queryPublicSeoCatalog,
  toSeoJobListItem,
} from "@/lib/data/seo";
import {
  confirmAlertSubscription,
  subscribeToAlerts,
  unsubscribeAlertSubscription,
} from "@/lib/data/subscribers";
import type { DatabaseClient, EmailQueueRow } from "@/lib/data/types";

const now = "2026-09-07T00:00:00.000Z";
const later = "2026-09-08T00:00:00.000Z";

const seoJob = {
  id: "job-1",
  title: "Platform Engineer",
  slug: "platform-engineer-northstar",
  description_md: "Build useful systems.",
  category_id: "category-1",
  category_name: "Software Engineering",
  category_slug: "software-engineering",
  employment_type: "full_time" as const,
  location: "Toronto, Canada",
  is_remote: true,
  remote_region: "Anywhere",
  salary_min: 120000,
  salary_max: 160000,
  currency: "USD",
  salary_period: "year",
  apply_mode: "url" as const,
  apply_url: "https://example.test/apply",
  apply_email: null,
  published_at: now,
  expires_at: "2026-10-07T00:00:00.000Z",
  updated_at: now,
  company_name: "Northstar Labs",
  company_slug: "northstar-labs",
  company_logo_url: null,
  company_website: "https://example.test",
  company_location: "Toronto, Canada",
  tag_slugs: ["typescript"],
};

const seoJobCopy = {
  ...seoJob,
  id: "job-2",
  title: "Senior Platform Engineer",
  slug: "senior-platform-engineer-northstar",
  updated_at: later,
  tag_slugs: ["typescript", "react"],
};

const seoJobOnsite = {
  ...seoJob,
  id: "job-3",
  title: "Product Designer",
  slug: "product-designer-acme",
  category_id: "category-2",
  category_name: "Design",
  category_slug: "design",
  company_name: "Acme Studio",
  company_slug: "acme-studio",
  location: "   ",
  is_remote: false,
  remote_region: null,
  apply_mode: "onsite" as const,
  apply_url: null,
};

const queueItem = {
  id: "queue-1",
  to_email: "person@example.com",
  template: "job_digest",
  payload: {},
  scheduled_for: now,
  sent_at: null,
  attempts: 1,
  last_error: null,
  created_at: now,
  dedupe_key: "digest:person@example.com:2026-09-07",
  claimed_at: now,
  claim_token: "claim-1",
  provider_message_id: null,
} as EmailQueueRow;

const client = { from: fromMock, rpc: rpcMock } as unknown as DatabaseClient;

describe("Week 8 automation data wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPublicClientMock.mockReturnValue(client);
  });

  it("wraps subscription RPCs and normalizes email addresses", async () => {
    rpcMock.mockResolvedValueOnce({ data: { id: "sub-1", email: "person@example.com" }, error: null });
    await expect(
      subscribeToAlerts(client, {
        email: "  Person@Example.COM ",
        categories: ["category-1"],
        frequency: "weekly",
      }),
    ).resolves.toEqual({ id: "sub-1", email: "person@example.com" });
    expect(rpcMock).toHaveBeenCalledWith("subscribe_to_alerts", {
      p_email: "person@example.com",
      p_categories: ["category-1"],
      p_frequency: "weekly",
    });

    rpcMock.mockResolvedValueOnce({ data: { email: "person@example.com" }, error: null });
    await expect(
      subscribeToAlerts(client, { email: "person@example.com", categories: [], frequency: "daily" }),
    ).rejects.toThrow("Subscription could not be created.");

    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "subscription failed" } });
    await expect(
      subscribeToAlerts(client, { email: "person@example.com", categories: [], frequency: "daily" }),
    ).rejects.toThrow("subscription failed");

    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    await expect(confirmAlertSubscription(client, " Person@Example.COM ", "confirm-token")).resolves.toBe(true);
    expect(rpcMock).toHaveBeenLastCalledWith("confirm_alert_subscription", {
      p_email: "person@example.com",
      p_token: "confirm-token",
    });

    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    await expect(unsubscribeAlertSubscription(client, "person@example.com", "unsubscribe-token")).resolves.toBe(
      false,
    );

    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "unsubscribe failed" } });
    await expect(unsubscribeAlertSubscription(client, "person@example.com", "bad-token")).rejects.toThrow(
      "unsubscribe failed",
    );
  });

  it("wraps queue and scheduled automation RPCs", async () => {
    rpcMock.mockResolvedValueOnce({ data: { expired: [{ id: "job-1", slug: "platform-engineer", expires_at: now }] }, error: null });
    await expect(expireDueJobs(client)).resolves.toEqual([
      { id: "job-1", slug: "platform-engineer", expires_at: now },
    ]);

    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await expect(expireDueJobs(client)).rejects.toThrow("Invalid expiry response.");
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "expiry failed" } });
    await expect(expireDueJobs(client)).rejects.toThrow("expiry failed");

    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await expect(keepSupabaseAlive(client)).resolves.toBeUndefined();
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "keep-alive failed" } });
    await expect(keepSupabaseAlive(client)).rejects.toThrow("keep-alive failed");

    rpcMock.mockResolvedValueOnce({ data: "4", error: null });
    await expect(enqueueDueDigests(client)).resolves.toBe(4);
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await expect(enqueueRenewalNudges(client)).resolves.toBe(0);

    rpcMock.mockResolvedValueOnce({ data: { claimToken: "claim-1", items: [queueItem] }, error: null });
    await expect(claimEmailQueue(client, 1, "claim-1")).resolves.toEqual({
      claimToken: "claim-1",
      items: [queueItem],
    });

    rpcMock.mockResolvedValueOnce({ data: { claimToken: "claim-2", items: [null] }, error: null });
    await expect(claimEmailQueue(client, 1, "claim-2")).rejects.toThrow("Invalid email queue item.");
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await expect(claimEmailQueue(client, 1, "claim-3")).rejects.toThrow("Invalid email queue response.");
    rpcMock.mockResolvedValueOnce({ data: { claimToken: "claim-4" }, error: null });
    await expect(claimEmailQueue(client, 1, "claim-4")).rejects.toThrow("Invalid email queue response.");
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "claim failed" } });
    await expect(claimEmailQueue(client, 1, "claim-5")).rejects.toThrow("claim failed");

    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    await expect(markEmailSent(client, "queue-1", "claim-1")).resolves.toBe(true);
    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    await expect(markEmailFailed(client, "queue-1", "claim-1", "provider failed")).resolves.toBe(false);
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "mark failed" } });
    await expect(markEmailSent(client, "queue-1", "claim-1", "provider-id")).rejects.toThrow("mark failed");
  });

  it("builds the public SEO catalog and indexing lookup", async () => {
    rpcMock.mockResolvedValue({
      data: { jobs: [seoJob, seoJobCopy, seoJobOnsite], latestPublishedAt: later },
      error: null,
    });
    const catalog = await queryPublicSeoCatalog(client);

    expect(catalog.latestPublishedAt).toBe(later);
    expect(catalog.companies).toEqual([
      expect.objectContaining({ slug: "acme-studio", liveJobCount: 1 }),
      expect.objectContaining({ slug: "northstar-labs", liveJobCount: 2, lastModified: later }),
    ]);
    expect(catalog.categories).toEqual([
      expect.objectContaining({ slug: "design", liveJobCount: 1 }),
      expect.objectContaining({ slug: "software-engineering", liveJobCount: 2, lastModified: later }),
    ]);
    expect(catalog.tags).toEqual([
      expect.objectContaining({ slug: "react", liveJobCount: 1 }),
      expect.objectContaining({ slug: "typescript", liveJobCount: 3, lastModified: later }),
    ]);
    expect(catalog.pseo).toEqual([
      expect.objectContaining({ slug: "jobs-in-toronto-canada", kind: "location", liveJobCount: 2 }),
      expect.objectContaining({ slug: "remote-software-engineering-jobs", kind: "remote-category", liveJobCount: 2 }),
    ]);

    expect(toSeoJobListItem(seoJob)).toMatchObject({
      id: "job-1",
      companyId: "seo-catalog",
      company: { name: "Northstar Labs", slug: "northstar-labs" },
      isFeatured: false,
      tags: ["typescript"],
    });
    expect(findPseoTarget(catalog, "remote-software-engineering-jobs", 2)).toMatchObject({ liveJobCount: 2 });
    expect(findPseoTarget(catalog, "remote-software-engineering-jobs", 3)).toBeNull();
    expect(findPseoTarget(catalog, "unknown-target", 1)).toBeNull();

    await expect(getPublicSeoCatalog()).resolves.toEqual(catalog);
    expect(cacheLifeMock).toHaveBeenCalledWith("minutes");
    expect(cacheTagMock).toHaveBeenCalledWith("jobs");

    const slugBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    slugBuilder.select.mockReturnValue(slugBuilder);
    slugBuilder.eq.mockReturnValue(slugBuilder);
    slugBuilder.maybeSingle.mockResolvedValue({ data: { slug: "platform-engineer-northstar" }, error: null });
    fromMock.mockReturnValue(slugBuilder);
    await expect(getJobSlugForIndexing(client, "job-1")).resolves.toBe("platform-engineer-northstar");

    slugBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getJobSlugForIndexing(client, "missing")).resolves.toBeNull();
    slugBuilder.maybeSingle.mockResolvedValue({ data: null, error: { message: "lookup failed" } });
    await expect(getJobSlugForIndexing(client, "missing")).rejects.toThrow("lookup failed");
  });
});

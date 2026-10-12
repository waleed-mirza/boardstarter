import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  listRecentAdminActions,
} from "@/lib/data/admin/audit";
import {
  approveAdminJob,
  deleteAdminJob,
  extendAdminJob,
  forceExpireAdminJob,
  getAdminJobById,
  listAdminJobs,
  listModerationQueue,
  rejectAdminJob,
  setAdminJobFeatured,
} from "@/lib/data/admin/jobs";
import { deleteAdminPackage, listAdminPackages, upsertAdminPackage } from "@/lib/data/admin/packages";
import { getAdminSiteSettings, updateAdminSiteSettings } from "@/lib/data/admin/settings";
import { getAdminStats } from "@/lib/data/admin/stats";
import { listAdminSubscribers, listAllAdminSubscribers } from "@/lib/data/admin/subscribers";
import {
  deleteAdminCategory,
  deleteAdminTag,
  listAdminCategories,
  listAdminTags,
  mergeAdminCategory,
  mergeAdminTag,
  upsertAdminCategory,
  upsertAdminTag,
} from "@/lib/data/admin/taxonomy";
import { toPublicSiteConfig } from "@/lib/data/settings";
import type { TestClient } from "../helpers/supabase";
import { adminClient, authenticatedClient } from "../helpers/supabase";

describe("admin data layer", () => {
  let admin!: TestClient;
  const service = adminClient();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const slugs: string[] = [];
  const packageVariant = `integration-admin-package-${suffix}`;
  const categorySlugs: string[] = [];
  const tagSlugs: string[] = [];

  beforeAll(async () => {
    admin = await authenticatedClient("admin@example.test");
  });

  afterAll(async () => {
    if (slugs.length > 0) {
      const { data: jobs } = await service.from("jobs").select("id").in("slug", slugs);
      const ids = (jobs ?? []).map((job) => job.id);
      if (ids.length > 0) {
        await service.from("payment_webhook_events").delete().in("job_id", ids);
        await service.from("orders").delete().in("job_id", ids);
        await service.from("jobs").delete().in("id", ids);
      }
    }
    if (categorySlugs.length > 0) await service.from("categories").delete().in("slug", categorySlugs);
    if (tagSlugs.length > 0) await service.from("tags").delete().in("slug", tagSlugs);
    await service.from("packages").delete().eq("ls_variant_id", packageVariant);
  });

  it("reads admin jobs, moderation queue, stats, packages, taxonomy, settings, subscribers, and audit data", async () => {
    const jobs = await listAdminJobs(admin, { query: "engineer", status: "all", page: 1 });
    expect(jobs.data.length).toBeGreaterThan(0);
    expect(await listAdminJobs(admin, { query: "", status: "published", page: 1 })).toMatchObject({ page: 1 });
    expect((await listModerationQueue(admin)).every((job) => job.status === "pending_review")).toBe(true);
    await expect(getAdminJobById(admin, jobs.data[0]!.id)).resolves.toMatchObject({ id: jobs.data[0]!.id });
    await expect(getAdminJobById(admin, "00000000-0000-4000-8000-000000000000")).resolves.toBeNull();
    expect((await getAdminStats(admin)).jobsByStatus.published).toBeGreaterThan(0);
    expect((await listAdminPackages(admin)).length).toBeGreaterThan(0);
    expect((await listAdminCategories(admin)).length).toBeGreaterThan(0);
    expect((await listAdminTags(admin)).length).toBeGreaterThan(0);
    expect((await getAdminSiteSettings(admin)).site_name).toBeTruthy();
    expect((await listAdminSubscribers(admin)).page).toBe(1);
    expect(await listAllAdminSubscribers(admin)).toBeInstanceOf(Array);
    expect(await listRecentAdminActions(admin)).toBeInstanceOf(Array);
  });

  it("runs the job mutation wrappers through the audited RPC boundary", async () => {
    const [{ data: company }, { data: category }, { data: listingPackage }] = await Promise.all([
      service.from("companies").select("id").eq("slug", "northstar-labs").single(),
      service.from("categories").select("id").eq("slug", "software-engineering").single(),
      service.from("packages").select("id, price_cents, currency").eq("ls_variant_id", "standard-listing-30").single(),
    ]);
    if (!company || !category || !listingPackage) throw new Error("Admin fixture prerequisites are missing");
    const paidSlug = `integration-admin-paid-${suffix}`;
    const rejectSlug = `integration-admin-reject-${suffix}`;
    const deleteSlug = `integration-admin-delete-${suffix}`;
    slugs.push(paidSlug, rejectSlug, deleteSlug);
    const { data: paidJob, error: paidError } = await service.from("jobs").insert({
      company_id: company.id, category_id: category.id, title: "Integration admin paid job", slug: paidSlug,
      description_md: "A paid listing for admin data integration coverage.", employment_type: "full_time",
      is_remote: true, currency: "USD", salary_period: "year", apply_mode: "url",
      apply_url: "https://example.test/admin-paid", status: "pending_review", package_id: listingPackage.id,
      expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    }).select("id").single();
    if (paidError || !paidJob) throw new Error(paidError?.message ?? "Could not create paid admin fixture");
    const { error: orderError } = await service.from("orders").insert({
      job_id: paidJob.id, package_id: listingPackage.id, provider: "integration", provider_order_id: `admin-${suffix}`,
      amount_cents: listingPackage.price_cents, expected_amount_cents: listingPackage.price_cents,
      amount_mismatch: false, currency: listingPackage.currency, status: "paid", raw: {},
    });
    if (orderError) throw new Error(orderError.message);
    const { data: rejectJob, error: rejectError } = await service.from("jobs").insert({
      company_id: company.id, category_id: category.id, title: "Integration admin reject job", slug: rejectSlug,
      description_md: "A pending listing for rejection coverage.", employment_type: "full_time",
      is_remote: true, currency: "USD", salary_period: "year", apply_mode: "url",
      apply_url: "https://example.test/admin-reject", status: "pending_review",
    }).select("id").single();
    if (rejectError || !rejectJob) throw new Error(rejectError?.message ?? "Could not create rejection fixture");
    const { data: deleteJob, error: deleteError } = await service.from("jobs").insert({
      company_id: company.id, category_id: category.id, title: "Integration admin delete job", slug: deleteSlug,
      description_md: "A draft listing for deletion coverage.", employment_type: "full_time",
      is_remote: true, currency: "USD", salary_period: "year", apply_mode: "url",
      apply_url: "https://example.test/admin-delete", status: "draft",
    }).select("id").single();
    if (deleteError || !deleteJob) throw new Error(deleteError?.message ?? "Could not create delete fixture");

    await expect(approveAdminJob(admin, paidJob.id)).resolves.toMatchObject({ ok: true });
    await expect(setAdminJobFeatured(admin, paidJob.id, true)).resolves.toMatchObject({ ok: true });
    await expect(extendAdminJob(admin, paidJob.id, 2)).resolves.toMatchObject({ ok: true });
    await expect(forceExpireAdminJob(admin, paidJob.id)).resolves.toMatchObject({ ok: true });
    await expect(deleteAdminJob(admin, paidJob.id)).rejects.toThrow(/payment history/);
    await expect(rejectAdminJob(admin, rejectJob.id, "Please clarify the scope.")).resolves.toMatchObject({ ok: true });
    await expect(deleteAdminJob(admin, deleteJob.id)).resolves.toMatchObject({ ok: true });
  });

  it("runs package, taxonomy, and settings mutation wrappers", async () => {
    const packageResult = await upsertAdminPackage(admin, { id: null, name: "Integration admin package", priceCents: 100, currency: "USD", durationDays: 7, isFeatured: false, lsVariantId: packageVariant, isActive: false, sort: 999 });
    expect(packageResult.ok).toBe(true);
    const packageId = String(packageResult.id);
    await expect(deleteAdminPackage(admin, packageId)).resolves.toMatchObject({ ok: true });

    const sourceCategorySlug = `integration-admin-source-category-${suffix}`;
    const targetCategorySlug = `integration-admin-target-category-${suffix}`;
    categorySlugs.push(sourceCategorySlug, targetCategorySlug);
    const sourceCategory = await upsertAdminCategory(admin, { id: null, name: "Integration source category", slug: sourceCategorySlug, description: null, sort: 9000 });
    const targetCategory = await upsertAdminCategory(admin, { id: null, name: "Integration target category", slug: targetCategorySlug, description: null, sort: 9001 });
    await expect(mergeAdminCategory(admin, String(sourceCategory.id), String(targetCategory.id))).resolves.toMatchObject({ ok: true });
    await expect(deleteAdminCategory(admin, String(targetCategory.id), null)).resolves.toMatchObject({ ok: true });

    const sourceTagSlug = `integration-admin-source-tag-${suffix}`;
    const targetTagSlug = `integration-admin-target-tag-${suffix}`;
    tagSlugs.push(sourceTagSlug, targetTagSlug);
    const sourceTag = await upsertAdminTag(admin, { id: null, name: "Integration source tag", slug: sourceTagSlug });
    const targetTag = await upsertAdminTag(admin, { id: null, name: "Integration target tag", slug: targetTagSlug });
    await expect(mergeAdminTag(admin, String(sourceTag.id), String(targetTag.id))).resolves.toMatchObject({ ok: true });
    await expect(deleteAdminTag(admin, String(targetTag.id), null)).resolves.toMatchObject({ ok: true });

    const current = toPublicSiteConfig(await getAdminSiteSettings(admin));
    const accent = current.accent === "blue" ? "violet" : "blue";
    const settingsInput = { ...current, logoUrl: current.logoUrl ?? "" };
    await expect(updateAdminSiteSettings(admin, { ...settingsInput, accent })).resolves.toMatchObject({ ok: true });
    await expect(updateAdminSiteSettings(admin, { ...settingsInput, accent: current.accent })).resolves.toMatchObject({ ok: true });
  });
});

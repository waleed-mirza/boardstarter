import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCompanyBySlug } from "@/lib/data/companies";
import { authenticatedClient, type TestClient } from "../helpers/supabase";

const cacheMocks = vi.hoisted(() => ({ updateTag: vi.fn() }));
vi.mock("next/cache", () => cacheMocks);

let sessionClient!: TestClient;
let categoryId = "";
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => sessionClient),
}));

import { closeJob, postJob, updateJob } from "@/lib/actions/jobs";

const DESCRIPTION = "A focused role with enough detail for an employer and a candidate to understand the work. ".repeat(2);

function valid(overrides: Record<string, unknown> = {}) {
  return {
    title: "Action Draft Job",
    descriptionMd: DESCRIPTION,
    categoryId,
    employmentType: "full_time",
    location: "Remote",
    isRemote: true,
    remoteRegion: "Anywhere",
    salaryMin: 100000,
    salaryMax: 140000,
    currency: "USD",
    salaryPeriod: "year",
    applyMode: "url",
    applyUrl: "https://example.test/apply",
    applyEmail: "",
    tagIds: [],
    ...overrides,
  };
}

async function companyId(client: TestClient): Promise<string> {
  const company = await getCompanyBySlug(client, "northstar-labs");
  if (!company) throw new Error("seed company missing");
  return company.id;
}

describe("employer job actions", () => {
  beforeEach(async () => {
    sessionClient = await authenticatedClient("employer-a@example.test");
    const { data: category, error } = await sessionClient.from("categories").select("id").eq("slug", "software-engineering").single();
    if (error || !category) throw new Error("seed category missing");
    categoryId = category.id;
    cacheMocks.updateTag.mockClear();
  });

  it("postJob creates draft and strips a crafted published status", async () => {
    const result = await postJob(valid({ status: "published", publishedAt: "2030-01-01T00:00:00Z" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    try {
      const { data, error } = await sessionClient.from("jobs").select("status, published_at, expires_at, is_featured").eq("id", result.data.jobId).single();
      expect(error).toBeNull();
      expect(data).toMatchObject({ status: "draft", published_at: null, expires_at: null, is_featured: false });
      expect(cacheMocks.updateTag).toHaveBeenCalledWith("company-" + (await companyId(sessionClient)));
    } finally {
      await sessionClient.from("jobs").delete().eq("id", result.data.jobId);
    }
  });

  it("rejects updateJob for another employer's job at the action layer", async () => {
    const employerB = await authenticatedClient("employer-b@example.test");
    const cobalt = await getCompanyBySlug(employerB, "cobalt-research");
    expect(cobalt).not.toBeNull();
    if (!cobalt) return;
    const { data: jobs, error } = await employerB.from("jobs").select("id, title").eq("company_id", cobalt.id).limit(1);
    expect(error).toBeNull();
    const otherJob = jobs?.[0];
    expect(otherJob).toBeDefined();
    if (!otherJob) return;

    await expect(updateJob(otherJob.id, valid())).resolves.toMatchObject({ ok: false, error: "Job not found." });
  });

  it("cannot change protected fields through updateJob", async () => {
    const created = await postJob(valid({ title: "Protected Fields Draft" }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    try {
      const result = await updateJob(
        created.data.jobId,
        valid({ status: "published", isFeatured: true, expiresAt: "2030-01-01T00:00:00Z", publishedAt: "2030-01-01T00:00:00Z" }),
      );
      expect(result.ok).toBe(true);
      const { data } = await sessionClient.from("jobs").select("status, is_featured, published_at, expires_at").eq("id", created.data.jobId).single();
      expect(data).toMatchObject({ status: "draft", is_featured: false, published_at: null, expires_at: null });
    } finally {
      await sessionClient.from("jobs").delete().eq("id", created.data.jobId);
    }
  });

  it("closeJob moves an owned draft out of the active list", async () => {
    const created = await postJob(valid({ title: "Close Me Draft" }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    try {
      await expect(closeJob(created.data.jobId)).resolves.toMatchObject({ ok: true, data: { jobId: created.data.jobId } });
      const { data } = await sessionClient.from("jobs").select("status").eq("id", created.data.jobId).single();
      expect(data?.status).toBe("expired");
    } finally {
      await sessionClient.from("jobs").delete().eq("id", created.data.jobId);
    }
  });
});

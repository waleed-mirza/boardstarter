import { beforeAll, describe, expect, it } from "vitest";

import { getCompanyBySlug } from "@/lib/data/companies";
import { getJobBySlug, getEmployerJobs, listPublishedJobs } from "@/lib/data/jobs";

import { anonClient, authenticatedClient, type TestClient } from "../helpers/supabase";

describe("jobs data layer", () => {
  let anonymous: TestClient;
  let employer: TestClient;

  beforeAll(async () => {
    anonymous = anonClient();
    employer = await authenticatedClient("employer-a@example.test");
  });

  it("returns only live published jobs for an anonymous client", async () => {
    const result = await listPublishedJobs(anonymous);
    expect(result.total).toBe(27);
    expect(result.data).toHaveLength(20);
    expect(result.page).toBe(1);
    expect(result.hasNext).toBe(true);
    expect(result.data.every((job) => job.expires_at !== null)).toBe(true);
  });

  it("applies web search, remote, and pagination filters", async () => {
    const result = await listPublishedJobs(anonymous, {
      query: "typescript developer",
      isRemote: true,
    });
    expect(result.total).toBe(1);
    expect(result.data.map((job) => job.slug)).toEqual(["senior-typescript-engineer"]);
  });

  it("returns live jobs and serves an expired job detail for its banner state", async () => {
    await expect(getJobBySlug(anonymous, "senior-typescript-engineer")).resolves.toMatchObject({
      slug: "senior-typescript-engineer",
      title: "Senior TypeScript Engineer",
    });
    await expect(getJobBySlug(anonymous, "qa-automation-engineer")).resolves.toBeNull();
    await expect(getJobBySlug(anonymous, "senior-ruby-engineer-expired")).resolves.toMatchObject({
      slug: "senior-ruby-engineer-expired",
      isExpired: true,
      status: "expired",
    });
  });

  it("returns the authenticated employer's jobs for an owned company", async () => {
    const company = await getCompanyBySlug(employer, "northstar-labs");
    expect(company).not.toBeNull();
    if (!company) return;
    const jobs = await getEmployerJobs(employer, company.id);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((job) => job.company_id === company.id)).toBe(true);
  });
});

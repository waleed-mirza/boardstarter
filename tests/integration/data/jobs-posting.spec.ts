import { describe, expect, it } from "vitest";

import { getCompanyBySlug } from "@/lib/data/companies";
import {
  createDraft,
  getEmployerJobs,
  updateEmployerJob,
  type EmployerJobWrite,
} from "@/lib/data/jobs";

import { authenticatedClient } from "../helpers/supabase";

const DESCRIPTION = "A focused role with enough detail for an employer and a candidate to understand the work. ".repeat(2);

function input(title: string, categoryId: string): EmployerJobWrite {
  return {
    title,
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
    applyEmail: undefined,
    tagIds: [],
  };
}

describe("employer jobs data layer", () => {
  it("creates a draft and returns application counts in the dashboard projection", async () => {
    const client = await authenticatedClient("employer-a@example.test");
    const company = await getCompanyBySlug(client, "northstar-labs");
    expect(company).not.toBeNull();
    if (!company) return;
    const { data: category, error: categoryError } = await client.from("categories").select("id").eq("slug", "software-engineering").single();
    expect(categoryError).toBeNull();
    if (!category) return;

    const created = await createDraft(client, company.id, input("Data Layer Draft Job", category.id));
    try {
      expect(created.status).toBe("draft");
      expect(created.published_at).toBeNull();
      expect(created.applicationsCount).toBe(0);
      await expect(getEmployerJobs(client, company.id)).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: created.id, status: "draft" })]),
      );
    } finally {
      await client.from("jobs").delete().eq("id", created.id);
    }
  });

  it("retries a globally colliding slug with a deterministic suffix", async () => {
    const client = await authenticatedClient("employer-a@example.test");
    const company = await getCompanyBySlug(client, "northstar-labs");
    expect(company).not.toBeNull();
    if (!company) return;
    const { data: category } = await client.from("categories").select("id").eq("slug", "software-engineering").single();
    if (!category) return;

    const first = await createDraft(client, company.id, input("Collision Handling Job", category.id));
    const second = await createDraft(client, company.id, input("Collision Handling Job", category.id));
    try {
      expect(second.slug).not.toBe(first.slug);
      expect(second.slug).toMatch(/-[0-9a-f]{4}$/);
    } finally {
      await client.from("jobs").delete().in("id", [first.id, second.id]);
    }
  });

  it("updates only owner-editable fields", async () => {
    const client = await authenticatedClient("employer-a@example.test");
    const company = await getCompanyBySlug(client, "northstar-labs");
    expect(company).not.toBeNull();
    if (!company) return;
    const { data: category } = await client.from("categories").select("id").eq("slug", "software-engineering").single();
    if (!category) return;

    const created = await createDraft(client, company.id, input("Editable Draft Job", category.id));
    try {
      const updated = await updateEmployerJob(client, company.id, created.id, input("Edited Draft Job", category.id));
      expect(updated.title).toBe("Edited Draft Job");
      expect(updated.status).toBe("draft");
      expect(updated.is_featured).toBe(false);
      expect(updated.published_at).toBeNull();
      expect(updated.expires_at).toBeNull();
    } finally {
      await client.from("jobs").delete().eq("id", created.id);
    }
  });
});

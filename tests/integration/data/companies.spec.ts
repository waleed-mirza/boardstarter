import { describe, expect, it } from "vitest";

import {
  getCompanyById,
  getCompanyBySlug,
  queryPublicCompanyBySlug,
  queryPublicCompanies,
} from "@/lib/data/companies";

import { anonClient, authenticatedClient } from "../helpers/supabase";

describe("companies data layer", () => {
  it("returns an owned company and hides another employer's private company", async () => {
    const employer = await authenticatedClient("employer-a@example.test");
    const own = await getCompanyBySlug(employer, "northstar-labs");
    expect(own?.name).toBe("Northstar Labs");
    const other = await getCompanyBySlug(employer, "cobalt-research");
    expect(other).toBeNull();
    if (own) await expect(getCompanyById(employer, own.id)).resolves.toMatchObject({ id: own.id });
  });

  it("does not expose private companies to anonymous clients", async () => {
    await expect(getCompanyBySlug(anonClient(), "northstar-labs")).resolves.toBeNull();
  });

  it("serves public company projections with live job counts", async () => {
    const client = anonClient();
    await expect(queryPublicCompanyBySlug(client, "northstar-labs")).resolves.toMatchObject({
      name: "Northstar Labs",
      liveJobCount: 4,
    });
    const companies = await queryPublicCompanies(client);
    expect(companies.length).toBe(11);
    expect(companies.every((company) => company.liveJobCount > 0)).toBe(true);
  });
});

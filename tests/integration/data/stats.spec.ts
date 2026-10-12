import { describe, expect, it } from "vitest";

import { queryHomePageData, queryPublicJobFacets, queryPublicBoardStats } from "@/lib/data/stats";

import { anonClient } from "../helpers/supabase";

describe("public board data", () => {
  it("returns real board stats and facet counts", async () => {
    const client = anonClient();
    await expect(queryPublicBoardStats(client)).resolves.toMatchObject({ jobCount: 27, companyCount: 11 });
    const facets = await queryPublicJobFacets(client);
    expect(facets.categories.find((item) => item.value === "software-engineering")?.count).toBe(12);
  });

  it("assembles the home payload without leaking workflow rows", async () => {
    const home = await queryHomePageData(anonClient());
    expect(home.stats.jobCount).toBe(27);
    expect(home.featured.data.length).toBeLessThanOrEqual(3);
    expect(home.latest.data).toHaveLength(10);
    expect(home.latest.data.every((job) => !["qa-automation-engineer", "senior-ruby-engineer-expired"].includes(job.slug))).toBe(true);
  });
});

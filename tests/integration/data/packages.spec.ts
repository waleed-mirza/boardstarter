import { describe, expect, it } from "vitest";

import { getPackageById, listActivePackages } from "@/lib/data/packages";

import { anonClient } from "../helpers/supabase";

describe("packages data layer", () => {
  it("returns active packages in configured sort order", async () => {
    const client = anonClient();
    const packages = await listActivePackages(client);
    expect(packages).toHaveLength(3);
    expect(packages.map((item) => item.sort)).toEqual([10, 20, 30]);
    await expect(getPackageById(client, packages[0]!.id)).resolves.toMatchObject({
      ls_variant_id: "standard-listing-30",
    });
  });
});

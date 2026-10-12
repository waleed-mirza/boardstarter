import { describe, expect, it } from "vitest";

import {
  getCategoryBySlug,
  getTagBySlug,
  listCategories,
  listTags,
} from "@/lib/data/taxonomy";

import { anonClient } from "../helpers/supabase";

describe("taxonomy data layer", () => {
  it("lists categories and tags in deterministic order", async () => {
    const client = anonClient();
    const categories = await listCategories(client);
    const tags = await listTags(client);
    expect(categories).toHaveLength(8);
    expect(categories.map((category) => category.slug)).toEqual([
      "software-engineering",
      "design",
      "product",
      "data",
      "marketing",
      "sales",
      "operations",
      "customer-success",
    ]);
    expect(tags).toHaveLength(20);
    expect(tags.map((tag) => tag.name)).toEqual(
      [...tags].sort((a, b) => a.name.localeCompare(b.name)).map((tag) => tag.name),
    );
  });

  it("looks up taxonomy by slug", async () => {
    const client = anonClient();
    await expect(getCategoryBySlug(client, "data")).resolves.toMatchObject({ name: "Data" });
    await expect(getTagBySlug(client, "typescript")).resolves.toMatchObject({ name: "TypeScript" });
    await expect(getTagBySlug(client, "missing-tag")).resolves.toBeNull();
  });

});

import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  buildJobSearchParams,
  parseJobSearchParams,
  sanitizeSearchQuery,
  toRpcFilters,
  type JobFilters,
} from "@/lib/jobs/filters";

describe("public job filter mapping", () => {
  it.each([
    [{}, {}],
    [{ query: "typescript", categories: ["software-engineering"] }, { query: "typescript", categories: ["software-engineering"] }],
    [
      {
        query: "typescript developer",
        categories: ["software-engineering", "data"],
        employmentTypes: ["full_time", "contract"],
        remote: true,
        location: "Remote",
        salaryBand: "100k-150k",
        tags: ["typescript", "react"],
        sort: "salary",
        companySlug: "northstar-labs",
        categorySlug: "software-engineering",
        tagSlug: "typescript",
        featuredOnly: true,
      },
      {
        query: "typescript developer",
        categories: ["software-engineering", "data"],
        employmentTypes: ["full_time", "contract"],
        remote: true,
        location: "Remote",
        salaryBand: "100k-150k",
        tags: ["typescript", "react"],
        sort: "salary",
        companySlug: "northstar-labs",
        categorySlug: "software-engineering",
        tag: "typescript",
        featuredOnly: true,
      },
    ],
  ] satisfies Array<[JobFilters, Record<string, unknown>]>)
    ("maps %j to the RPC filter object", (filters, expected) => {
      expect(toRpcFilters(filters)).toEqual(expected);
    });

  it("round-trips the shareable URL facets", () => {
    const filters: JobFilters = {
      query: " senior   typescript ",
      categories: ["software-engineering", "data"],
      employmentTypes: ["full_time", "contract"],
      remote: false,
      location: "Berlin",
      salaryBand: "75k-100k",
      tags: ["typescript", "react"],
      sort: "salary",
    };
    const params = buildJobSearchParams(filters, 3);
    expect(parseJobSearchParams({
      q: params.get("q") ?? undefined,
      category: params.getAll("category"),
      type: params.getAll("type"),
      remote: params.get("remote") ?? undefined,
      location: params.get("location") ?? undefined,
      salary: params.get("salary") ?? undefined,
      tag: params.getAll("tag"),
      sort: params.get("sort") ?? undefined,
      page: params.get("page") ?? undefined,
    }).filters).toEqual({
      ...filters,
      query: "senior typescript",
    });
    expect(parseJobSearchParams({ page: params.get("page") ?? undefined }).page).toBe(3);
  });

  it("accepts repeated URL values and ignores unknown facet values", () => {
    const { filters, page } = parseJobSearchParams({
      category: ["software-engineering", "software-engineering", "data"],
      type: ["full_time", "not-a-type"],
      remote: "1",
      salary: "not-a-band",
      page: "0",
    });
    expect(filters).toMatchObject({
      categories: ["software-engineering", "data"],
      employmentTypes: ["full_time"],
      remote: true,
      sort: "newest",
    });
    expect(filters.salaryBand).toBeUndefined();
    expect(page).toBe(1);
  });

  it("treats an empty search string as no search filter", () => {
    expect(parseJobSearchParams({ q: "\"\"" }).filters.query).toBeUndefined();
    expect(toRpcFilters({ query: "!!!" })).toEqual({});
  });

  it("counts active facets without counting the sort control", () => {
    expect(activeFilterCount({ query: "design", categories: ["design"], remote: true, sort: "salary" })).toBe(3);
    expect(activeFilterCount({ isRemote: false, tags: ["react", "typescript"] })).toBe(3);
  });
});

describe("search input sanitization", () => {
  it.each([
    ["\"typescript developer\"", "typescript developer"],
    ["react OR next.js -legacy", "react OR next js legacy"],
    ["'; DROP TABLE jobs; --", "DROP TABLE jobs"],
    ["foo | bar (baz) [qux]", "foo bar baz qux"],
    ["   ", ""],
  ])("normalizes %j", (input, expected) => {
    expect(sanitizeSearchQuery(input)).toBe(expected);
  });

  it("limits a long query and preserves unicode words", () => {
    const query = `${"équipe ".repeat(100)}${"x".repeat(500)}`;
    const sanitized = sanitizeSearchQuery(query);
    expect(sanitized.length).toBeLessThanOrEqual(500);
    expect(sanitized).toContain("équipe");
    expect(sanitized).not.toMatch(/["';|()[\]{}:*]/);
  });
});

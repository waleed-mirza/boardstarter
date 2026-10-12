import { describe, expect, it } from "vitest";

import { buildPseoIntro, parsePseoSlug, pseoLocationSlug } from "@/lib/seo/pseo";

describe("pSEO routes", () => {
  it("parses remote category and location slugs", () => {
    expect(parsePseoSlug("remote-product-design-jobs")).toEqual({ kind: "remote-category", slug: "remote-product-design-jobs", categorySlug: "product-design" });
    expect(parsePseoSlug("jobs-in-san-francisco")).toEqual({ kind: "location", slug: "jobs-in-san-francisco", locationSlug: "san-francisco" });
    expect(parsePseoSlug("not-a-pseo-page")).toBeNull();
  });

  it("creates unique, readable intros", () => {
    const remote = parsePseoSlug("remote-engineering-jobs");
    const location = parsePseoSlug("jobs-in-berlin");
    expect(remote && buildPseoIntro(remote, "Engineering", 3)).toContain("3 remote engineering roles");
    expect(location && buildPseoIntro(location, "Berlin", 1)).toContain("1 live job in Berlin");
    expect(pseoLocationSlug("São Paulo")).toBe("sao-paulo");
  });
});

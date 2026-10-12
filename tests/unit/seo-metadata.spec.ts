import { describe, expect, it } from "vitest";

import { buildPageMetadata, canonicalUrl } from "@/lib/seo/metadata";

describe("SEO metadata", () => {
  it("sets canonical, OpenGraph, and Twitter metadata", () => {
    const value = buildPageMetadata({ siteUrl: "https://jobs.example.com", title: "Engineering jobs", description: "Live roles", path: "/categories/engineering", image: "/og.png" });
    expect(canonicalUrl("https://jobs.example.com", "jobs")).toBe("https://jobs.example.com/jobs");
    expect(value.alternates?.canonical).toBe("https://jobs.example.com/categories/engineering");
    expect(value.openGraph).toMatchObject({ type: "website", url: "https://jobs.example.com/categories/engineering" });
    expect(value.twitter).toMatchObject({ card: "summary_large_image" });
    expect(value.robots).toEqual({ index: true, follow: true });
  });

  it("marks expired pages noindex", () => {
    expect(buildPageMetadata({ siteUrl: "https://jobs.example.com", title: "Expired", description: "", path: "/jobs/expired", noindex: true }).robots).toEqual({ index: false, follow: true });
  });
});

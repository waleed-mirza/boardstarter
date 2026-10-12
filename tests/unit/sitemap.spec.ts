import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://jobs.example.com";
  return {
    getCachedPublicSiteConfig: vi.fn(),
    getPublicSeoCatalog: vi.fn(),
  };
});

vi.mock("@/lib/data/settings", () => ({ getCachedPublicSiteConfig: mocks.getCachedPublicSiteConfig }));
vi.mock("@/lib/data/seo", () => ({ getPublicSeoCatalog: mocks.getPublicSeoCatalog }));

import sitemap from "@/app/sitemap";

describe("public sitemap", () => {
  it("includes live catalog surfaces and filters thin pSEO targets", async () => {
    mocks.getCachedPublicSiteConfig.mockResolvedValue({ pseoMinimumLiveJobs: 3 });
    mocks.getPublicSeoCatalog.mockResolvedValue({
      latestPublishedAt: "2026-09-08T00:00:00.000Z",
      jobs: [{ slug: "engineer-acme", updated_at: "2026-09-07T00:00:00.000Z" }],
      companies: [{ slug: "acme", lastModified: "2026-09-07T00:00:00.000Z" }],
      categories: [{ slug: "engineering", lastModified: "2026-09-07T00:00:00.000Z" }],
      tags: [{ slug: "typescript", lastModified: "2026-09-07T00:00:00.000Z" }],
      pseo: [
        { slug: "remote-engineering-jobs", liveJobCount: 3, lastModified: "2026-09-08T00:00:00.000Z" },
        { slug: "jobs-in-atlantis", liveJobCount: 2, lastModified: "2026-09-08T00:00:00.000Z" },
      ],
    });

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual([
      "https://jobs.example.com",
      "https://jobs.example.com/categories/engineering",
      "https://jobs.example.com/companies",
      "https://jobs.example.com/companies/acme",
      "https://jobs.example.com/jobs",
      "https://jobs.example.com/jobs/engineer-acme",
      "https://jobs.example.com/remote-engineering-jobs",
      "https://jobs.example.com/tags/typescript",
    ]);
    expect(urls).not.toContain("https://jobs.example.com/jobs-in-atlantis");
  });
});

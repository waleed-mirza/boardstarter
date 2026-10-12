import { XMLParser } from "fast-xml-parser";
import { describe, expect, it } from "vitest";

import { buildRssFeed } from "@/lib/seo/feed";

describe("RSS feeds", () => {
  it("produces valid XML and escapes special characters", () => {
    const xml = buildRssFeed({
      title: "Jobs & teams",
      description: "Roles <now>",
      url: "https://jobs.example.com",
      items: [{ title: "C++ & Platform <Engineer>", url: "https://jobs.example.com/jobs/a?x=1&y=2", description: "Build <things>", publishedAt: "2026-01-01T00:00:00Z", companyName: "A&B", categoryName: "R&D" }],
    });
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
    expect(parsed.rss.channel.item.title).toBe("C++ & Platform <Engineer>");
    expect(xml).toContain("C++ &amp; Platform &lt;Engineer&gt;");
  });
});

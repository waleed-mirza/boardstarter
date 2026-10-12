import { describe, expect, it } from "vitest";

import { createJobSlugBase, createJobSlugCandidate } from "@/lib/jobs/slug";

describe("job slug generation", () => {
  it("creates a deterministic URL-safe title-company base", () => {
    const slug = createJobSlugBase("Senior TypeScript Engineer", "Northstar Labs");
    expect(slug).toBe("senior-typescript-engineer-northstar-labs");
    expect(createJobSlugBase("Senior TypeScript Engineer", "Northstar Labs")).toBe(slug);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("normalizes accents and removes emoji", () => {
    const slug = createJobSlugBase("Café ☕ Engineer 🚀", "München Labs");
    expect(slug).toBe("cafe-engineer-munchen-labs");
  });

  it("falls back safely when unicode has no ASCII transliteration", () => {
    const slug = createJobSlugBase("研究者 🧪", "会社");
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(slug).not.toContain("undefined");
  });

  it("adds deterministic hexadecimal suffixes for collisions", () => {
    const base = createJobSlugBase("Platform Engineer", "Northstar Labs");
    const first = createJobSlugCandidate(base, 1);
    expect(first).toBe(createJobSlugCandidate(base, 1));
    expect(first).toMatch(new RegExp(`^${base}-[0-9a-f]{4}$`));
    expect(createJobSlugCandidate(base, 2)).not.toBe(first);
    expect(createJobSlugCandidate(base, 0)).toBe(base);
  });
});

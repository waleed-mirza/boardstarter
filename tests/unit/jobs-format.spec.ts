import { describe, expect, it } from "vitest";

import { formatEmploymentType, formatRelativeDate, formatSalary, getApplyHref } from "@/lib/jobs/format";

describe("job display formatting", () => {
  it("formats employment, salary, and relative dates", () => {
    expect(formatEmploymentType("full_time")).toBe("Full-time");
    expect(formatSalary({ salaryMin: 90000, salaryMax: 120000, currency: "USD", salaryPeriod: "year" })).toContain("90,000");
    expect(formatSalary({ salaryMin: null, salaryMax: null, currency: "USD", salaryPeriod: "year" })).toBeNull();
    expect(formatRelativeDate("2026-09-06T00:00:00Z", "2026-09-07T00:00:00Z")).toBe("1 day ago");
  });

  const applyCases: Array<[Parameters<typeof getApplyHref>[0], string]> = [
    [{ slug: "one", applyMode: "email", applyEmail: "hello@example.com" }, "mailto:hello@example.com"],
    [{ slug: "two", applyMode: "url", applyUrl: "https://example.com/apply" }, "https://example.com/apply"],
    [{ slug: "three", applyMode: "onsite" }, "/jobs/three#apply"],
  ];

  it.each(applyCases)("builds the apply target", (job, expected) => {
    expect(getApplyHref(job)).toBe(expected);
  });
});

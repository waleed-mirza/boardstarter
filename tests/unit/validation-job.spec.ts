import { describe, expect, it } from "vitest";

import { jobSchema } from "@/lib/validation/job";

const CATEGORY_ID = "00000000-0000-4000-8000-000000000001";
const DESCRIPTION = "A focused role with enough detail for an employer and a candidate to understand the work. ".repeat(2);

function valid(overrides: Record<string, unknown> = {}) {
  return {
    title: "Senior Platform Engineer",
    descriptionMd: DESCRIPTION,
    categoryId: CATEGORY_ID,
    employmentType: "full_time",
    location: "Remote",
    isRemote: true,
    remoteRegion: "Anywhere",
    salaryMin: 100000,
    salaryMax: 140000,
    currency: "USD",
    salaryPeriod: "year",
    applyMode: "url",
    applyUrl: "https://example.test/apply",
    applyEmail: "",
    tagIds: [],
    ...overrides,
  };
}

function issueFor(input: Record<string, unknown>, field: string) {
  const result = jobSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("expected validation to fail");
  return result.error.issues.find((issue) => issue.path.join(".") === field);
}

describe("jobSchema", () => {
  it("accepts a valid URL application payload", () => {
    expect(jobSchema.parse(valid())).toMatchObject({ title: "Senior Platform Engineer" });
  });

  it("accepts an email application payload", () => {
    expect(jobSchema.parse(valid({ applyMode: "email", applyUrl: "", applyEmail: "jobs@example.test" }))).toMatchObject({
      applyMode: "email",
    });
  });

  it("accepts an onsite application payload without a target", () => {
    expect(jobSchema.parse(valid({ applyMode: "onsite", applyUrl: "", applyEmail: "" }))).toMatchObject({
      applyMode: "onsite",
    });
  });

  it("rejects a title shorter than four characters", () => {
    expect(issueFor(valid({ title: "Dev" }), "title")?.message).toContain("4");
  });

  it("rejects a title longer than one hundred characters", () => {
    expect(issueFor(valid({ title: "x".repeat(101) }), "title")?.message).toContain("100");
  });

  it("rejects a description shorter than one hundred characters", () => {
    expect(issueFor(valid({ descriptionMd: "x" }), "descriptionMd")?.message).toContain("100");
  });

  it("rejects a description longer than twenty thousand characters", () => {
    expect(issueFor(valid({ descriptionMd: "x".repeat(20001) }), "descriptionMd")?.message).toContain("20,000");
  });

  it("requires a URL for URL applications", () => {
    expect(issueFor(valid({ applyUrl: "" }), "applyUrl")?.message).toContain("URL");
  });

  it("rejects malformed application URLs", () => {
    expect(issueFor(valid({ applyUrl: "not a url" }), "applyUrl")?.message).toContain("valid URL");
  });

  it("requires an email for email applications", () => {
    expect(issueFor(valid({ applyMode: "email", applyUrl: "", applyEmail: "" }), "applyEmail")?.message).toContain("email");
  });

  it("rejects malformed application emails", () => {
    expect(issueFor(valid({ applyMode: "email", applyUrl: "", applyEmail: "nope" }), "applyEmail")?.message).toContain("email");
  });

  it("rejects an inverted salary range", () => {
    expect(issueFor(valid({ salaryMin: 150000, salaryMax: 100000 }), "salaryMax")?.message).toContain("greater");
  });

  it("accepts an open-ended salary range", () => {
    expect(jobSchema.parse(valid({ salaryMin: 100000, salaryMax: null })).salaryMax).toBeNull();
  });

  it("rejects an invalid category id", () => {
    expect(issueFor(valid({ categoryId: "not-a-uuid" }), "categoryId")).toBeDefined();
  });

  it("rejects an invalid employment type", () => {
    expect(issueFor(valid({ employmentType: "freelance" }), "employmentType")).toBeDefined();
  });

  it("rejects a non-uppercase three-letter currency", () => {
    expect(issueFor(valid({ currency: "usd" }), "currency")).toBeDefined();
  });

  it("normalizes empty optional fields and trims text", () => {
    const parsed = jobSchema.parse(valid({ title: "  Platform Engineer  ", location: "", remoteRegion: "", applyEmail: "" }));
    expect(parsed.title).toBe("Platform Engineer");
    expect(parsed.location).toBeUndefined();
    expect(parsed.remoteRegion).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import { applicationSchema } from "../../src/lib/validation/application";

describe("onsite application validation", () => {
  it("accepts a concise application", () => {
    expect(
      applicationSchema.safeParse({
        jobId: "00000000-0000-4000-8000-000000000001",
        name: "Ada Lovelace",
        email: "ada@example.com",
        message: "I would love to help.",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid contact details", () => {
    expect(applicationSchema.safeParse({ jobId: "bad", name: "", email: "nope" }).success).toBe(false);
  });
});

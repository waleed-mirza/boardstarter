import { describe, expect, it } from "vitest";

import { companySchema, parseNextParam, signInSchema } from "@/lib/validation/auth";

describe("signInSchema", () => {
  it("accepts a valid email", () => {
    expect(signInSchema.parse({ email: "employer@example.test" })).toEqual({
      email: "employer@example.test",
    });
  });

  it("rejects a missing or malformed email", () => {
    expect(signInSchema.safeParse({}).success).toBe(false);
    expect(signInSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("companySchema", () => {
  it("accepts a name alone and trims it", () => {
    expect(companySchema.parse({ name: "  Acme  " })).toEqual({ name: "Acme" });
  });

  it("rejects an empty or over-120-char name", () => {
    expect(companySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(companySchema.safeParse({ name: "x".repeat(121) }).success).toBe(false);
  });

  it("treats empty optional fields as undefined", () => {
    expect(companySchema.parse({ name: "Acme", website: "", location: "" })).toEqual({
      name: "Acme",
    });
  });

  it("rejects a non-URL website", () => {
    expect(companySchema.safeParse({ name: "Acme", website: "not-a-url" }).success).toBe(false);
    expect(companySchema.safeParse({ name: "Acme", website: "https://acme.test" }).success).toBe(
      true,
    );
  });
});

describe("parseNextParam", () => {
  it.each([
    [undefined, "/dashboard", "/dashboard"],
    [null, "/dashboard", "/dashboard"],
    ["", "/dashboard", "/dashboard"],
    ["", "/jobs", "/jobs"],
    ["/dashboard", "/dashboard", "/dashboard"],
    ["/dashboard/post?draft=1", "/dashboard/post?draft=1", "/dashboard"],
    ["/admin/queue", "/admin/queue", "/dashboard"],
    ["//evil.example", "/dashboard", "/dashboard"],
    ["/\\evil.example", "/dashboard", "/dashboard"],
    ["https://evil.example", "/dashboard", "/dashboard"],
    ["dashboard", "/dashboard", "/dashboard"],
  ])("maps %p (fallback %s) to %s", (raw, expected, fallback) => {
    expect(parseNextParam(raw, fallback)).toBe(expected);
  });

  it("falls back when the raw value is an array of params", () => {
    expect(parseNextParam(["/dashboard", "/admin"], "/dashboard")).toBe("/dashboard");
  });
});

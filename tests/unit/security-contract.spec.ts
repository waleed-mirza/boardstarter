import { describe, expect, it } from "vitest";

import {
  assertApiRoutesGuarded,
  assertPublicEnvNamesSafe,
  assertRlsMigrations,
} from "../../scripts/verify-security";

describe("Week 9 security contract", () => {
  it("keeps all public tables under RLS", () => {
    expect(() => assertRlsMigrations(process.cwd())).not.toThrow();
  });

  it("does not expose secret-like NEXT_PUBLIC variables", () => {
    expect(() => assertPublicEnvNamesSafe(process.cwd())).not.toThrow();
  });

  it("guards every API route", () => {
    expect(() => assertApiRoutesGuarded(process.cwd())).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";

import { requireData, toSettings } from "@/lib/data/types";

describe("data helpers", () => {
  it("returns successful data and turns setting rows into a map", () => {
    expect(requireData({ value: 1 }, null)).toEqual({ value: 1 });
    expect(
      toSettings([
        { key: "site_name", value: "Example", updated_at: "2026-01-01T00:00:00Z" },
        { key: "enabled", value: true, updated_at: "2026-01-01T00:00:00Z" },
      ]),
    ).toEqual({ site_name: "Example", enabled: true });
  });

  it("throws the database error or a missing-data error", () => {
    expect(() => requireData(null, { message: "database unavailable" })).toThrow(
      "database unavailable",
    );
    expect(() => requireData(null, null)).toThrow("Supabase returned no data");
  });
});

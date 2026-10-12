import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("later class wins when Tailwind classes conflict", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("keeps non-conflicting classes and drops falsy inputs", () => {
    expect(cn("text-sm", "font-medium", false && "hidden", undefined)).toBe(
      "text-sm font-medium"
    );
  });
});

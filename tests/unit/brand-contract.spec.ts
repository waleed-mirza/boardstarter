import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe("brand contract", () => {
  it("keeps the internal product name out of defaults and demo surfaces", () => {
    const root = process.cwd();
    const files = [
      join(root, "supabase", "seed.sql"),
      join(root, "src", "lib", "config", "presets.ts"),
      join(root, "src", "lib", "data", "settings.ts"),
      ...filesUnder(join(root, "src", "components", "email")),
      join(root, "src", "lib", "email", "theme.ts"),
    ];
    const leaked = files.filter((file) => /boardstarter/i.test(readFileSync(file, "utf8")));
    expect(leaked).toEqual([]);
  });

  it("keeps docs casing consistent", () => {
    const root = process.cwd();
    // The historical build plan cites forbidden casings as examples of what
    // not to ship; lint:forbidden excludes it for the same reason.
    const excluded = new Set([join(root, "docs", "BOARDSTARTER-10-WEEK-BUILD-PLAN.md")]);
    const files = filesUnder(join(root, "docs"))
      .concat([join(root, "README.md")])
      .filter((file) => !excluded.has(file));
    const bad = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const wrongProductCase = ["Board", "Starter"].join("");
      const wrongSpacedCase = ["Board", " ", "Starter"].join("");
      return source.includes(wrongProductCase) || source.includes(wrongSpacedCase) ? [file] : [];
    });
    expect(bad).toEqual([]);
  });
});

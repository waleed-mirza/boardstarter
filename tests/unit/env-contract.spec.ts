import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe("environment documentation", () => {
  it("documents every process.env variable used by application and scripts", () => {
    const root = process.cwd();
    const files = filesUnder(join(root, "src")).concat(filesUnder(join(root, "scripts"))).filter((file) => /\.(ts|tsx)$/.test(file));
    const used = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        if (match[1]) used.add(match[1]);
      }
    }
    const example = readFileSync(join(root, ".env.example"), "utf8");
    const undocumented = [...used].filter((name) => !new RegExp(`^${name}=`, "m").test(example));
    expect(undocumented).toEqual([]);
  });
});

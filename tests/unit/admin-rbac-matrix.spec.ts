import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const adminRouteRoot = join(projectRoot, "src", "app", "(admin)", "admin");
const adminActionRoot = join(projectRoot, "src", "lib", "actions", "admin");

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe("admin RBAC matrix", () => {
  it("keeps every admin route behind the 403-aware guard", () => {
    const routes = filesUnder(adminRouteRoot).filter((file) =>
      /(?:page|route)\.tsx?$/.test(file),
    );
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(readFileSync(route, "utf8"), route).toMatch(/requireAdmin/);
    }
  });

  it("keeps every admin server action behind the same guard", () => {
    const actions = filesUnder(adminActionRoot).filter((file) => file.endsWith(".ts"));
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(readFileSync(action, "utf8"), action).toMatch(/requireAdmin|runAdminAction/);
    }
  });
});

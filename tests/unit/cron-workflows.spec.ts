import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("cron workflow delivery modes", () => {
  it("schedules only the Supabase keep-alive task for the demo", () => {
    const workflow = readProjectFile(".github/workflows/cron.yml");

    expect(workflow).toContain('cron: "17 3 * * *"');
    expect(workflow).toContain("${SITE_URL}/api/cron/keep-alive");
    expect(workflow).not.toMatch(/expire-jobs|send-digest|renewal-nudges/);
  });

  it("ships the full automation workflow as an opt-in example", () => {
    const workflow = readProjectFile("docs/examples/github-actions-full-cron.yml");

    expect(workflow).toContain('cron: "*/15 * * * *"');
    expect(workflow).toContain("task: [expire-jobs, send-digest, renewal-nudges, keep-alive]");
  });
});

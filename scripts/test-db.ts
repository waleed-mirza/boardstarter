import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

import { databaseHost, testDatabaseClient, testDatabaseUrl } from "./lib/db";

/**
 * pgTAP runner (ADR 0003 — no Docker). Replaces `supabase test db`:
 * runs every supabase/tests/*.test.sql against TEST_DATABASE_URL, each file
 * in its own transaction, rolled back afterwards.
 *
 * pgTAP assertions return their TAP line as a row value ("ok 1 - …"),
 * so the runner harvests ok/not-ok lines from every statement's results —
 * the same way pg_prove reads TAP. `finish()` stays required in each file:
 * it raises on plan mismatches (wrong declared test count), which fails the
 * run as an exception.
 */

const TAP_LINE = /^(not )?ok \d+\s*-?\s*(.*)$/;

function harvestTapLines(results: pg.QueryResult | pg.QueryResult[]): string[] {
  const list = Array.isArray(results) ? results : [results];
  const lines: string[] = [];
  for (const result of list) {
    for (const row of result?.rows ?? []) {
      for (const value of Object.values(row)) {
        if (typeof value === "string") {
          const firstLine = value.split(/\r?\n/, 1)[0] ?? "";
          if (TAP_LINE.test(firstLine)) lines.push(firstLine);
        }
      }
    }
  }
  return lines;
}

function plannedAssertions(results: pg.QueryResult | pg.QueryResult[]): number | null {
  const list = Array.isArray(results) ? results : [results];
  for (const result of list) {
    for (const row of result?.rows ?? []) {
      for (const value of Object.values(row)) {
        if (typeof value !== "string") continue;
        const match = value.match(/^1\.\.(\d+)/);
        if (match) return Number(match[1]);
      }
    }
  }
  return null;
}

async function main() {
  const url = testDatabaseUrl();

  const testDir = join("supabase", "tests");
  const files = readdirSync(testDir)
    .filter((name) => name.endsWith(".test.sql"))
    .sort();
  if (files.length === 0) {
    console.error("✖ No *.test.sql files found in supabase/tests.");
    process.exit(1);
  }

  const client = testDatabaseClient();
  await client.connect();
  console.log(`→ pgTAP against ${databaseHost(url)}: ${files.length} file(s)`);

  let totalFailures = 0;
  for (const file of files) {
    const content = readFileSync(join(testDir, file), "utf8");
    await client.query("begin");
    try {
      const results = (await client.query(content)) as pg.QueryResult | pg.QueryResult[];
      const lines = harvestTapLines(results);
      if (lines.length === 0) {
        throw new Error(
          "no TAP output — the file must use plan()/assertions and end with `select * from finish();`",
        );
      }
      const planned = plannedAssertions(results);
      if (planned !== null && planned !== lines.length) {
        throw new Error(`${file} planned ${planned} assertions but emitted ${lines.length}`);
      }
      const failed = lines.filter((line) => line.startsWith("not ok"));
      totalFailures += failed.length;
      console.log(
        `  ${failed.length === 0 ? "✓" : "✖"} ${file} — ${lines.length - failed.length} passed, ${failed.length} failed`,
      );
      for (const line of failed) {
        console.log(`      ${line}`);
      }
    } finally {
      await client.query("rollback");
    }
  }

  await client.end();
  if (totalFailures > 0) {
    console.error(`✖ ${totalFailures} pgTAP assertion(s) failed.`);
    process.exit(1);
  }
  console.log("✓ All pgTAP tests passed.");
}

main().catch((error) => {
  console.error("✖ db test run crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

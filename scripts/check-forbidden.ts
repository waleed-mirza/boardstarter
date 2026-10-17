import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * §0.2 forbidden-pattern check (CI greps for these) plus the Boardstarter
 * casing rule (plan naming rule 5). Runs as `pnpm lint:forbidden` and in CI.
 * Exits 1 listing every violation with file:line.
 */

type Rule = { id: string; pattern: RegExp; note: string };

const RULES: Rule[] = [
  {
    id: "middleware.ts",
    pattern: /\bmiddleware\.(ts|js)\b/,
    note: "Next 16 renamed it — use src/proxy.ts",
  },
  {
    id: "auth-helpers",
    pattern: /@supabase\/auth-helpers/,
    note: "use @supabase/ssr",
  },
  {
    id: "getSession-on-server",
    pattern: /\.getSession\(\)/,
    note: "use getUser() on the server",
  },
  {
    id: "revalidateTag-single-arg",
    pattern: /revalidateTag\((["'`][^"'`)]+["'`])\)/,
    note: "two-arg form revalidateTag(tag, 'max') or updateTag in a Server Action",
  },
  {
    id: "cookie-get-set-remove",
    pattern: /cookies\(\)\.(get|set|remove)\(/,
    note: "cookies() is async and must use getAll/setAll",
  },
  { id: "any-type", pattern: /:\s*any\b|as\s+any\b/, note: "fix the type" },
  { id: "ts-ignore", pattern: /@ts-ignore/, note: "use @ts-expect-error with a reason, or fix the type" },
  {
    id: "eslint-disable-no-reason",
    pattern: /eslint-disable(-next-line)?\s.+?(?<! -- .*)$/,
    note: "every disable needs a trailing `-- reason` comment",
  },
  {
    id: "casing",
    pattern: /BoardStarter|Board Starter|boardStarter/,
    note: 'casing is always "Boardstarter"',
  },
];

// Files that cite forbidden names by design (the rules themselves).
const EXCLUDED_FILES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  "BOARDSTARTER-10-WEEK-BUILD-PLAN.md",
  join("docs", "BOARDSTARTER-10-WEEK-BUILD-PLAN.md"),
  "eslint.config.mjs",
  "pnpm-lock.yaml",
  "scripts/check-forbidden.ts",
  join(".cursor", "rules", "boardstarter.mdc"),
]);

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".netlify",
  ".git",
  "test-results",
  "playwright-report",
  "e2e",
  "docs/decisions",
  join("src", "components", "ui"),
]);

const SCANNABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".css",
  ".md",
  ".json",
  ".mjs",
  ".yml",
  ".yaml",
]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    // Normalize to forward slashes so exclusions match on every OS.
    const rel = relative(".", full).split(sep).join("/");
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.has(entry) || EXCLUDED_DIRS.has(rel)) continue;
      yield* walk(full);
    } else {
      const ext = entry.slice(entry.lastIndexOf("."));
      if (!SCANNABLE_EXTENSIONS.has(ext)) continue;
      if (EXCLUDED_FILES.has(entry) || EXCLUDED_FILES.has(rel)) continue;
      yield full;
    }
  }
}

function main() {
  const violations: string[] = [];

  for (const file of walk(".")) {
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          violations.push(
            `${file.split(sep).join("/")}:${index + 1} [${rule.id}] ${rule.note}\n    ${line.trim()}`
          );
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error(`✖ ${violations.length} forbidden-pattern violation(s):`);
    for (const violation of violations) console.error(`    ${violation}`);
    process.exit(1);
  }
  console.log("✓ No forbidden patterns.");
}

main();

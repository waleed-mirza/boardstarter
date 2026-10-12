import { config } from "dotenv";

import { parseEnv, REQUIRED_IN_PRODUCTION, type EnvParseResult } from "@/lib/config/env";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

/**
 * Validates presence and format of env vars (§6) at startup and in CI.
 * Dev default: warn on missing, fail on malformed. `--strict` (CI/prod):
 * fail on missing required-for-production keys too.
 */

function main() {
  const strict = process.argv.includes("--strict");
  const raw = { ...process.env } as Record<string, string | undefined>;

  const result: EnvParseResult = parseEnv(raw);

  if (!result.ok) {
    console.error("✖ Environment format errors:");
    for (const { field, message } of result.fieldErrors) {
      console.error(`    ${field}: ${message}`);
    }
    process.exit(1);
  }

  const present = new Set(
    Object.entries(raw)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key]) => key)
  );

  if (strict) {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !present.has(key));
    if (missing.length > 0) {
      console.error(`✖ --strict: missing required variables: ${missing.join(", ")}`);
      process.exit(1);
    }
  } else {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !present.has(key));
    if (missing.length > 0) {
      console.warn(`⚠ not set yet (fine for Week 1 local dev): ${missing.join(", ")}`);
    }
  }

  console.log(
    `✓ Environment OK — site ${result.env.NEXT_PUBLIC_SITE_URL}, preset ${result.env.NEXT_PUBLIC_PRESET}${strict ? " (strict)" : ""}`
  );
}

main();

import { testDatabaseClient } from "./lib/db";
import { applyMigrations } from "./lib/migrations";

/**
 * Applies forward-only migrations to TEST_DATABASE_URL. The migration history
 * lives in the unexposed boardstarter_internal schema (ADR 0003).
 */
async function main() {
  const client = testDatabaseClient();
  await client.connect();
  try {
    await applyMigrations(client);
    console.log("✓ Migrations up to date.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("✖ db push crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

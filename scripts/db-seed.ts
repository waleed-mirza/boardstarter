import { testDatabaseClient } from "./lib/db";
import { applySeed } from "./lib/migrations";

async function main() {
  const client = testDatabaseClient();
  await client.connect();
  try {
    await applySeed(client);
    console.log("✓ Seed applied.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("✖ db seed crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

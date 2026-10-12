import { testDatabaseClient, testDatabaseUrl } from "./lib/db";
import { clearFixtureUsers } from "./lib/db-reset";
import { applyMigrations, applySeed, INTERNAL_SCHEMA } from "./lib/migrations";

function projectRef(url: string): string | null {
  const match = url.match(/postgres\.([a-z0-9]+):/i);
  return match?.[1] ?? null;
}

function requireResetConfirmation(url: string): void {
  const ref = projectRef(url);
  const confirmation = process.env.BOARDSTARTER_DB_RESET_CONFIRM;
  if (!ref || !confirmation || confirmation !== ref) {
    throw new Error(
      "Refusing cloud reset. Set BOARDSTARTER_DB_RESET_CONFIRM to the exact Supabase project ref.",
    );
  }
}

async function main() {
  const url = testDatabaseUrl();
  requireResetConfirmation(url);
  const client = testDatabaseClient();
  await client.connect();
  try {
    const unexpectedUsers = await client.query<{ email: string | null }>(`
      select email
      from auth.users
      where coalesce(raw_app_meta_data ->> 'seed_source', '') <> 'fixture-test'
    `);
    if (unexpectedUsers.rowCount) {
      throw new Error(
        `Refusing reset: auth.users contains ${unexpectedUsers.rowCount} non-test user(s).`,
      );
    }

    await clearFixtureUsers(client);

    console.log("→ dropping application schemas on the dedicated test project");
    await client.query("drop schema if exists public cascade");
    await client.query("create schema public");
    await client.query("grant usage on schema public to anon, authenticated, service_role");
    await client.query("grant all on schema public to postgres, service_role");
    await client.query(`drop schema if exists ${INTERNAL_SCHEMA} cascade`);

    await applyMigrations(client, { reset: true });
    await applySeed(client);
    console.log("✓ Database reset and seed completed.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("✖ db reset crashed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

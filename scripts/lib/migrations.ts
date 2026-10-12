import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type pg from "pg";

export const INTERNAL_SCHEMA = "boardstarter_internal";

export function migrationFiles(): string[] {
  return readdirSync(join("supabase", "migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

export async function ensureMigrationStore(client: pg.Client): Promise<void> {
  await client.query(`create schema if not exists ${INTERNAL_SCHEMA}`);
  await client.query(`
    create table if not exists ${INTERNAL_SCHEMA}.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

export async function appliedMigrations(client: pg.Client): Promise<Set<string>> {
  await ensureMigrationStore(client);
  const { rows } = await client.query<{ name: string }>(
    `select name from ${INTERNAL_SCHEMA}.schema_migrations`,
  );
  return new Set(rows.map((row) => row.name));
}

export async function applyMigrations(
  client: pg.Client,
  options: { reset?: boolean } = {},
): Promise<void> {
  await ensureMigrationStore(client);
  const applied = options.reset ? new Set<string>() : await appliedMigrations(client);

  for (const file of migrationFiles()) {
    if (applied.has(file)) continue;
    const content = readFileSync(join("supabase", "migrations", file), "utf8");
    console.log(`→ applying ${file}`);
    await client.query("begin");
    try {
      await client.query(content);
      await client.query(`insert into ${INTERNAL_SCHEMA}.schema_migrations (name) values ($1)`, [
        file,
      ]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw new Error(
        `migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export async function applySeed(client: pg.Client): Promise<void> {
  const content = readFileSync(join("supabase", "seed.sql"), "utf8");
  await client.query("begin");
  try {
    await client.query(content);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw new Error(`seed failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

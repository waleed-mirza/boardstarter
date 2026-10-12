import { config } from "dotenv";
import pg from "pg";

/**
 * Shared database connections for the no-Docker harness and first-install
 * setup. Passwords from Supabase pooler URLs are normalized before pg sees
 * them because generated passwords may contain URI-unsafe characters.
 */

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function normalizeUserinfo(raw: string): string {
  const match = raw.match(/^(postgresql:\/\/)([^@/:]+):([^@]*)@(.*)$/);
  if (!match) return raw;
  const [, scheme, user, pass, rest] = match as RegExpMatchArray &
    [string, string, string, string, string, string];
  const encode = (value: string) => {
    try {
      return encodeURIComponent(decodeURIComponent(value));
    } catch {
      return encodeURIComponent(value);
    }
  };
  return `${scheme}${encode(user)}:${encode(pass)}@${rest}`;
}

function databaseUrlFrom(name: "DATABASE_URL" | "TEST_DATABASE_URL"): string {
  const raw = process.env[name];
  if (!raw) {
    console.error(
      `âœ– ${name} is not set.\n` +
        "  Put the Supabase session-pooler connection string in .env.local:\n" +
        `  ${name}=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`,
    );
    process.exit(1);
  }
  return normalizeUserinfo(raw.trim());
}

export function testDatabaseUrl(): string {
  return databaseUrlFrom("TEST_DATABASE_URL");
}

export function setupDatabaseUrl(): string {
  if (process.env.DATABASE_URL?.trim()) return normalizeUserinfo(process.env.DATABASE_URL.trim());
  if (process.env.TEST_DATABASE_URL?.trim()) {
    console.warn("âš  DATABASE_URL is not set; setup is using TEST_DATABASE_URL.");
    return normalizeUserinfo(process.env.TEST_DATABASE_URL.trim());
  }
  return databaseUrlFrom("DATABASE_URL");
}

export function testDatabaseClient(): pg.Client {
  return new pg.Client({
    connectionString: testDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
}

export function setupDatabaseClient(): pg.Client {
  return new pg.Client({
    connectionString: setupDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
}

export function databaseHost(url: string): string {
  return url
    .replace(/^[^@]+@/, "https://")
    .replace(/:\d+/, "")
    .replace(/^https:\/\//, "")
    .replace(/\/.*/, "");
}

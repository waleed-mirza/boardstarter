import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type ClientBundleLeak = {
  file: string;
  marker: string;
};

const STATIC_MARKERS = [
  "SUPABASE_SECRET_KEY",
  "LEMONSQUEEZY_API_KEY",
  "LEMONSQUEEZY_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "ALERT_TOKEN_SECRET",
  "GOOGLE_INDEXING_SA_JSON",
] as const;
// The Supabase SDK contains the bare prefix as a format discriminator. A
// secret-like suffix or the configured full value is the actionable leak.
const SECRET_KEY_PATTERN = /sb_secret_[A-Za-z0-9_-]{8,}/;
const PAYMENT_SECRET_PATTERNS = [/lsk_[A-Za-z0-9_-]{8,}/, /whsec_[A-Za-z0-9_-]{8,}/];

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

/** Finds secret-key names or values that accidentally reached browser assets. */
export function findClientBundleLeaks(buildDirectory: string): ClientBundleLeak[] {
  const markers: string[] = [...STATIC_MARKERS];
  const configuredSecret = process.env.SUPABASE_SECRET_KEY;
  if (configuredSecret?.startsWith("sb_secret_")) markers.push(configuredSecret);
  markers.push(
    ...[
      process.env.LEMONSQUEEZY_API_KEY,
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    ].filter((value): value is string => Boolean(value)),
  );

  return filesUnder(join(buildDirectory, "static")).flatMap((file) => {
    const contents = readFileSync(file, "utf8");
    const marker =
      markers.find((candidate) => contents.includes(candidate)) ??
      contents.match(SECRET_KEY_PATTERN)?.[0] ??
      PAYMENT_SECRET_PATTERNS.map((pattern) => contents.match(pattern)?.[0]).find(
        (value): value is string => Boolean(value),
      );
    return marker ? [{ file, marker }] : [];
  });
}

export function assertClientBundleSafe(buildDirectory: string): void {
  const leaks = findClientBundleLeaks(buildDirectory);
  if (leaks.length === 0) return;

  const details = leaks.map(({ file, marker }) => `${file}: ${marker}`).join("\n");
  throw new Error(`Client bundle contains server-only Supabase material:\n${details}`);
}

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return filesUnder(directory).filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
}

export function assertPublicEnvNamesSafe(rootDirectory: string): void {
  const files = sourceFiles(join(rootDirectory, "src")).concat(sourceFiles(join(rootDirectory, "scripts")));
  const unsafe = files.flatMap((file) => {
    const contents = readFileSync(file, "utf8");
    return [...contents.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)]
      .map((match) => match[1])
      .filter((name): name is string => Boolean(name))
      .filter((name) => /(SECRET|TOKEN|PASSWORD|API_KEY)/.test(name));
  });
  if (unsafe.length > 0) throw new Error(`Secret-like variables use NEXT_PUBLIC_: ${[...new Set(unsafe)].join(", ")}`);
}

export function assertRlsMigrations(rootDirectory: string): void {
  const migrationDirectory = join(rootDirectory, "supabase", "migrations");
  const contents = filesUnder(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const tables = [...contents.matchAll(/create table(?: if not exists)? public\.([a-z_][a-z0-9_]*)/gi)]
    .map((match) => match[1])
    .filter((table): table is string => Boolean(table));
  const missing = [...new Set(tables)].filter(
    (table) => !new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(contents),
  );
  if (missing.length > 0) throw new Error(`Public tables missing RLS: ${missing.join(", ")}`);
}

export function assertApiRoutesGuarded(rootDirectory: string): void {
  const apiDirectory = join(rootDirectory, "src", "app", "api");
  const unguarded = filesUnder(apiDirectory)
    .filter((file) => file.endsWith("route.ts"))
    .filter((file) => {
      const contents = readFileSync(file, "utf8");
      return !/(consumeRateLimit|parseWebhook|requireCronAuth|isAuthorizedCronRequest|authorization|timingSafeEqual)/.test(contents);
    });
  if (unguarded.length > 0) throw new Error(`API routes need auth or a rate limit: ${unguarded.join(", ")}`);
}

function main(): void {
  const buildDirectory = resolve(process.argv[2] ?? ".next");
  assertClientBundleSafe(buildDirectory);
  const rootDirectory = resolve(".");
  assertPublicEnvNamesSafe(rootDirectory);
  assertRlsMigrations(rootDirectory);
  assertApiRoutesGuarded(rootDirectory);
  console.log(`✓ Client bundle is free of Supabase secret material (${buildDirectory})`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main();
}

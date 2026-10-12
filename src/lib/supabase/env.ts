/**
 * Env access for the Supabase client factories. Kept free of `server-only` and
 * Next imports so unit tests can exercise the failure modes directly.
 * New-style keys only (§0.2) — legacy anon/service_role are rejected upstream
 * by the env schema in `src/lib/config/env.ts`.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} — copy .env.example to .env.local and fill it in (see docs/quickstart.md)`,
    );
  }
  return value;
}

export function requirePublicEnv(): { url: string; publishableKey: string } {
  // Keep these property accesses static so Next.js inlines the public values
  // into the browser bundle. A computed process.env[name] lookup is empty in
  // client code even when the corresponding NEXT_PUBLIC_* variable is set.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return { url, publishableKey };
}

export function requireAdminEnv(): { url: string; secretKey: string } {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey: requireEnv("SUPABASE_SECRET_KEY"),
  };
}

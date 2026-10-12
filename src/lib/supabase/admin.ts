import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { requireAdminEnv } from "./env";

// Secret-key client that bypasses RLS — the profile lookup and role update
// must run before any authenticated session exists to authorize them.
// Allowed only in `src/app/api/webhooks/*`, `src/app/api/cron/*`,
// `src/lib/actions/admin/*`, and `scripts/*`.
export function createAdminClient() {
  const { url, secretKey } = requireAdminEnv();
  return createSupabaseClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

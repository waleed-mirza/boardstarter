import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";
import { requirePublicEnv } from "./env";

/**
 * Browser-side Supabase client (`'use client'` components only). Session
 * storage is handled by `@supabase/ssr`'s cookies — never `auth.storage`.
 */
export function createClient() {
  const { url, publishableKey } = requirePublicEnv();
  return createBrowserClient<Database>(url, publishableKey);
}

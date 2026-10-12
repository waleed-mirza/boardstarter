import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./types";
import { requirePublicEnv } from "./env";

/**
 * Request-scoped server client. Create a new one per render — never share a
 * client across requests. Cookie writes during Server Component rendering
 * throw by design; `src/proxy.ts` performs the session refresh that matters.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = requirePublicEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — proxy.ts owns cookie sync.
        }
      },
    },
  });
}

/**
 * Anonymous, request-independent client for public reads. Cached public
 * functions must not call cookies(), otherwise one visitor's session can
 * become part of a shared cache key. RLS still applies to this client.
 */
export function createPublicClient() {
  const { url, publishableKey } = requirePublicEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Anonymous public reads never refresh a session.
      },
    },
  });
}

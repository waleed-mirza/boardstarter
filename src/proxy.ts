import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { requirePublicEnv } from "@/lib/supabase/env";

/**
 * Session refresh only — this runs on every matched request, so it stays
 * minimal: refresh the auth token, sync cookies between request and response,
 * pass through. Route protection lives in `src/lib/auth/guards.ts`; auth
 * decisions must never depend on proxy (§Week 3, plan task 3).
 */
export async function proxy(request: NextRequest) {
  const { url, publishableKey } = requirePublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the session if needed; updated cookies flow out via setAll.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|feed.xml).*)"],
};

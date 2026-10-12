import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { parseNextParam } from "@/lib/validation/auth";

/**
 * OAuth callback exchanges a PKCE code; email links verify their token hash.
 * `next` goes through the open-redirect guard before use.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tokenType = searchParams.get("type");
  const nextPath = parseNextParam(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  if (tokenHash && (tokenType === "email" || tokenType === "magiclink")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType });
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", nextPath);
  return NextResponse.redirect(signIn);
}

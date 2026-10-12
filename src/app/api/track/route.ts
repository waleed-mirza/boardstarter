import { createPublicClient } from "@/lib/supabase/server";
import { incrementJobCounter } from "@/lib/data/tracking";
import { consumeRateLimit } from "@/lib/data/rate-limit";
import { rateLimitKey } from "@/lib/security/request";
import { trackingEventSchema } from "@/lib/validation/tracking";
import { getTrackingCookieName, hasTrackingCookie, isBotUserAgent } from "@/lib/tracking/request";

export async function POST(request: Request): Promise<Response> {
  if (isBotUserAgent(request.headers.get("user-agent"))) return new Response(null, { status: 204 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = trackingEventSchema.safeParse(input);
  if (!parsed.success) return Response.json({ ok: false, error: "Invalid tracking event" }, { status: 400 });

  const cookieName = getTrackingCookieName(parsed.data.kind, parsed.data.jobId);
  if (hasTrackingCookie(request.headers.get("cookie"), cookieName)) {
    return new Response(null, { status: 204 });
  }

  try {
    const client = createPublicClient();
    if (!(await consumeRateLimit(client, rateLimitKey("track", request.headers), 120, 60))) {
      return new Response(null, { status: 429 });
    }
    await incrementJobCounter(client, parsed.data.jobId, parsed.data.kind);
  } catch {
    // Tracking is intentionally best-effort; never block a job page or apply navigation.
    return new Response(null, { status: 204 });
  }

  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": `${cookieName}=1; Max-Age=60; Path=/; SameSite=Lax; HttpOnly${secure}`,
    },
  });
}

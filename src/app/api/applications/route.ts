import { submitApplication } from "@/lib/data/applications";
import { consumeRateLimit } from "@/lib/data/rate-limit";
import { rateLimitKey } from "@/lib/security/request";
import { createPublicClient } from "@/lib/supabase/server";
import { applicationSchema } from "@/lib/validation/application";

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }
  try {
    const client = createPublicClient();
    if (!(await consumeRateLimit(client, rateLimitKey("application", request.headers), 5, 3600))) {
      return Response.json({ ok: false, error: "Please wait before sending another application." }, { status: 429 });
    }
    await submitApplication(client, parsed.data);
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ ok: false, error: "We could not send your application. Please try again." }, { status: 503 });
  }
}

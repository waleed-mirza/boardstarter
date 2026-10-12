import { redirect } from "next/navigation";

import { confirmAlertSubscription } from "@/lib/data/subscribers";
import { verifyAlertToken } from "@/lib/email/tokens";
import { createPublicClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = verifyAlertToken(token, "confirm");
  if (!payload) redirect("/alerts?status=invalid");
  const confirmed = await confirmAlertSubscription(
    createPublicClient(),
    payload.email,
    payload.nonce,
  );
  redirect(confirmed ? "/alerts?status=confirmed" : "/alerts?status=already-used");
}

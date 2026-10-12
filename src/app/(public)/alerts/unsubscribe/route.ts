import { redirect } from "next/navigation";

import { unsubscribeAlertSubscription } from "@/lib/data/subscribers";
import { verifyAlertToken } from "@/lib/email/tokens";
import { createPublicClient } from "@/lib/supabase/server";

async function unsubscribe(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = verifyAlertToken(token, "unsubscribe", Date.now());
  if (!payload) redirect("/alerts?status=invalid");
  const removed = await unsubscribeAlertSubscription(
    createPublicClient(),
    payload.email,
    payload.nonce,
  );
  redirect(removed ? "/alerts?status=unsubscribed" : "/alerts?status=already-used");
}

export async function GET(request: Request): Promise<Response> {
  return unsubscribe(request);
}

export async function POST(request: Request): Promise<Response> {
  return unsubscribe(request);
}

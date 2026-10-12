import { requireAdmin } from "@/lib/auth/guards";
import { listAllAdminSubscribers } from "@/lib/data/admin/subscribers";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: string | null): string { return `"${(value ?? "").replaceAll('"', '""')}"`; }

export async function GET() {
  await requireAdmin("/admin/subscribers");
  const subscribers = await listAllAdminSubscribers(await createClient());
  const header = ["email", "frequency", "confirmed_at", "unsubscribed_at", "created_at"];
  const lines = [header.join(","), ...subscribers.map((item) => [item.email, item.frequency, item.confirmed_at, item.unsubscribed_at, item.created_at].map(csvCell).join(","))];
  return new Response(`${lines.join("\n")}\n`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="subscribers.csv"', "cache-control": "no-store" } });
}

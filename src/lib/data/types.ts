import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";

export type DatabaseClient = SupabaseClient<Database>;
export type PublicTables = keyof Database["public"]["Tables"];
export type Row<Table extends PublicTables> = Database["public"]["Tables"][Table]["Row"];
export type JobRow = Row<"jobs">;
export type CompanyRow = Row<"companies">;
export type ProfileRow = Row<"profiles">;
export type CategoryRow = Row<"categories">;
export type TagRow = Row<"tags">;
export type PackageRow = Row<"packages">;
export type OrderRow = Row<"orders">;
export type PaymentWebhookEventRow = Row<"payment_webhook_events">;
export type AdminActionRow = Row<"admin_actions">;
export type SubscriberRow = Row<"subscribers">;
export type SiteSettingRow = Row<"site_settings">;
export type EmailQueueRow = Row<"email_queue">;
export type EmploymentType = Database["public"]["Enums"]["employment_type"];
export type JobStatus = Database["public"]["Enums"]["job_status"];
export type AlertFrequency = Database["public"]["Enums"]["alert_frequency"];

export type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};

export function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Supabase returned no data");
  return data;
}

export function toSettings(rows: SiteSettingRow[]): Record<string, Json> {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

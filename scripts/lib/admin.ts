import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/types";

export type EnsureAdminResult = { email: string; created: boolean };

/**
 * First-install bootstrap. The service key is intentionally confined to the
 * scripts boundary because an admin session does not exist yet for RLS to
 * authorize this operation.
 */
export async function ensureAdmin({
  url,
  secretKey,
  email,
}: {
  url: string;
  secretKey: string;
  email: string;
}): Promise<EnsureAdminResult> {
  const admin = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`could not list users: ${error.message}`);

  let user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
  let created = false;
  if (!user) {
    const result = await admin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: { full_name: normalizedEmail.split("@")[0] },
    });
    if (result.error || !result.data.user) {
      throw new Error(`could not create admin user: ${result.error?.message ?? "unknown error"}`);
    }
    user = result.data.user;
    created = true;
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id);
  if (updateError) throw new Error(`could not promote admin profile: ${updateError.message}`);
  return { email: normalizedEmail, created };
}

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/types";

/**
 * Promotes ADMIN_EMAIL to the admin role (Week 3 task 7).
 * Uses the secret key because no admin session can exist yet to satisfy
 * RLS — bootstrapping the first admin is exactly the case RLS cannot cover.
 */

async function main() {
  config({ path: ".env.local", quiet: true });
  config({ path: ".env", quiet: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const email = process.env.ADMIN_EMAIL;
  if (!url || !secretKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  }
  if (!email) {
    throw new Error("ADMIN_EMAIL is required — set it in .env.local first");
  }

  const admin = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`could not list users: ${error.message}`);
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error(
      `No auth user for ${email}. Sign up once at /sign-in (the profile trigger runs), then re-run this script.`,
    );
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id);
  if (updateError) throw new Error(updateError.message);

  console.log(`✓ ${email} is now an admin.`);
}

main().catch((error) => {
  console.error(`✖ create-admin failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

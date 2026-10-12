import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Supabase URL and publishable key are required for data tests");
const supabaseUrl = url;
const supabaseKey = key;

/** Secret-key client for arranging fixtures (users) RLS cannot create. */
export function adminClient(): TestClient {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is required to arrange auth fixtures");
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type TestClient = SupabaseClient<Database>;

export function anonClient(): TestClient {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function authenticatedClient(email: string): Promise<TestClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: "DemoPass!234",
  });
  if (error) throw new Error(`test sign-in failed: ${error.message}`);
  return client;
}

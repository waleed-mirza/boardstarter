"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Clears the session cookies and returns to the public board. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

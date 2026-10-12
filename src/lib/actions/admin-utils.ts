"use server";

import { updateTag } from "next/cache";

import { requireAdmin, type SessionUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

import { fail, ok, type ActionResult } from "./result";

export async function runAdminAction<T>(
  next: string,
  tags: readonly string[],
  handler: (client: Awaited<ReturnType<typeof createClient>>, user: SessionUser) => Promise<T>,
): Promise<ActionResult<T>> {
  const user = await requireAdmin(next);
  const client = await createClient();
  try {
    const result = await handler(client, user);
    for (const tag of tags) updateTag(tag);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "The admin action could not be completed.");
  }
}


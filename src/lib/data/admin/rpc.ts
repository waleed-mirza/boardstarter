import type { Json } from "@/lib/supabase/types";

import type { DatabaseClient } from "../types";

export function asRpcObject(value: Json | null): Record<string, Json | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Supabase returned an invalid admin mutation result.");
  }
  return value as Record<string, Json | undefined>;
}

export function rpcString(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export async function callAdminMutation<T extends Record<string, Json | undefined>>(
  client: DatabaseClient,
  data: Json | null,
): Promise<T> {
  const result = asRpcObject(data);
  if (result.ok !== true) {
    throw new Error(rpcString(result.error) ?? "The admin mutation could not be completed.");
  }
  return result as T;
}

export function mutationError(error: { message: string } | null): never {
  throw new Error(error?.message ?? "The admin mutation could not be completed.");
}


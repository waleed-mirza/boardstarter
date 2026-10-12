import type { DatabaseClient } from "./types";

export async function consumeRateLimit(
  client: DatabaseClient,
  key: string,
  limit = 20,
  windowSeconds = 60,
): Promise<boolean> {
  const { data, error } = await client.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

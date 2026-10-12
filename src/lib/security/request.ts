import { createHash } from "node:crypto";

export function requestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-nf-client-connection-ip")?.trim() || "unknown";
}

export function rateLimitKey(scope: string, headers: Headers): string {
  const ip = requestIp(headers);
  const secret = process.env.RATE_LIMIT_SECRET ?? "boardstarter-local-rate-limit";
  return `${scope}:${createHash("sha256").update(`${secret}:${ip}`).digest("hex")}`;
}

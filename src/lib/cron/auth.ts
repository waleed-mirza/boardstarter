import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCronRequest(
  request: Request,
  secret = process.env.CRON_SECRET,
): boolean {
  if (!secret) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  const expected = Buffer.from(secret, "utf8");
  const actual = Buffer.from(supplied, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

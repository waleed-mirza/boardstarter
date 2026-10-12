export type TrackingKind = "view" | "click";

export function getTrackingCookieName(kind: TrackingKind, jobId: string): string {
  return `boardstarter-track-${kind}-${jobId}`;
}

export function isBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawler|spider|slurp|bingpreview|headless|facebookexternalhit|preview/i.test(userAgent);
}

export function hasTrackingCookie(cookieHeader: string | null, name: string): boolean {
  return (cookieHeader ?? "")
    .split(";")
    .map((value) => value.trim().split("=", 1)[0])
    .some((value) => value === name);
}

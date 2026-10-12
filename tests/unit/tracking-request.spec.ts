import { describe, expect, it } from "vitest";

import { getTrackingCookieName, hasTrackingCookie, isBotUserAgent } from "@/lib/tracking/request";

describe("tracking request guards", () => {
  const jobId = "00000000-0000-4000-8000-000000000000";

  it("identifies bots and missing user agents", () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 Chrome/140")).toBe(false);
  });

  it("debounces only the exact event cookie", () => {
    const name = getTrackingCookieName("view", jobId);
    expect(hasTrackingCookie(`${name}=1; other=value`, name)).toBe(true);
    expect(hasTrackingCookie(`${getTrackingCookieName("click", jobId)}=1`, name)).toBe(false);
    expect(hasTrackingCookie(null, name)).toBe(false);
  });
});

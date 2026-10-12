import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(async () => ({ name: "client" })),
  subscribeToAlerts: vi.fn(async () => ({ id: "subscriber-1", email: "person@example.com" })),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/data/subscribers", () => ({ subscribeToAlerts: mocks.subscribeToAlerts }));

import { subscribeToJobAlerts } from "@/lib/actions/alerts";

describe("alert signup action", () => {
  beforeEach(() => {
    process.env.ALERT_TOKEN_SECRET = "01234567890123456789012345678901";
    process.env.NEXT_PUBLIC_SITE_URL = "https://jobs.example.com";
    vi.clearAllMocks();
  });

  it("creates an unconfirmed subscription for queued confirmation delivery", async () => {
    const result = await subscribeToJobAlerts({
      email: "Person@example.com",
      categories: [],
      frequency: "weekly",
    });
    expect(result).toEqual({ ok: true });
    expect(mocks.subscribeToAlerts).toHaveBeenCalledWith(expect.anything(), {
      email: "person@example.com",
      categories: [],
      frequency: "weekly",
    });
  });

  it("rejects invalid input before touching persistence or email", async () => {
    const result = await subscribeToJobAlerts({
      email: "not-an-email",
      categories: [],
      frequency: "weekly",
    });
    expect(result.ok).toBe(false);
    expect(mocks.subscribeToAlerts).not.toHaveBeenCalled();
    expect(mocks.subscribeToAlerts).not.toHaveBeenCalled();
  });
});

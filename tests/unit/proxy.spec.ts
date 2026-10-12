import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Supabase client is mocked: these tests verify our proxy's wiring
// (session refresh, cookie forwarding, never blocking), not Supabase itself.
type SetCookieItem = { name: string; value: string; options?: { path?: string } };

type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (toSet: SetCookieItem[]) => void;
};

const ssrMocks = vi.hoisted(() => {
  const state: { setAll: null | ((toSet: SetCookieItem[]) => void) } = { setAll: null };
  return {
    state,
    createServerClient: vi.fn(
      (url: string, key: string, options: { cookies: { setAll: (toSet: SetCookieItem[]) => void } }) => {
        state.setAll = options.cookies.setAll;
        void url;
        void key;
        return {
          auth: {
            // Simulate a token refresh: Supabase writes the new session back
            // through setAll before getUser resolves.
            getUser: vi.fn(async () => {
              state.setAll?.([{ name: "sb-test-auth-token", value: "refreshed", options: { path: "/" } }]);
              return { data: { user: null }, error: null };
            }),
          },
        };
      },
    ),
  };
});

vi.mock("@supabase/ssr", () => ssrMocks);

import { config, proxy } from "@/proxy";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  ssrMocks.state.setAll = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("proxy matcher", () => {
  it.each([
    ["/", true],
    ["/jobs", true],
    ["/sign-in", true],
    ["/dashboard", true],
    ["/dashboard/post", true],
    ["/admin/queue", true],
    ["/api/webhooks/lemonsqueezy", false],
    ["/api/cron/expire-jobs", false],
    ["/_next/static/chunks/app.js", false],
    ["/_next/image?url=x", false],
    ["/favicon.ico", false],
    ["/sitemap.xml", false],
    ["/robots.txt", false],
  ])("%s is %s", (pathname, shouldMatch) => {
    expect(
      unstable_doesMiddlewareMatch({ config, url: `http://localhost:3000${pathname}` }),
    ).toBe(shouldMatch);
  });
});

describe("proxy", () => {
  it("refreshes the session via getUser and never blocks the request", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/dashboard"));
    expect(ssrMocks.createServerClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      "sb_publishable_test-key",
      expect.objectContaining({ cookies: expect.objectContaining({ getAll: expect.any(Function) }) }),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("forwards refreshed session cookies onto the response", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/dashboard"));
    expect(response.headers.getSetCookie()).toContain("sb-test-auth-token=refreshed; Path=/");
  });

  it("reads request cookies through getAll", async () => {
    const request = new NextRequest("http://localhost:3000/dashboard");
    request.cookies.set("sb-req-auth-token", "from-browser");
    await proxy(request);
    const options = ssrMocks.createServerClient.mock.calls[0]?.[2] as
      | { cookies: CookieAdapter }
      | undefined;
    // The simulated refresh adds its own request cookie, so assert membership.
    expect(options?.cookies.getAll()).toContainEqual({
      name: "sb-req-auth-token",
      value: "from-browser",
    });
  });
});

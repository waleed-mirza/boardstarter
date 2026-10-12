import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Wiring under test: our env handling and the getAll/setAll cookie adapter.
// The real client construction is exercised end-to-end by the auth E2E suite.
type MockCookieAdapter = {
  getAll: () => unknown;
  setAll: (toSet: unknown[]) => void;
};

const ssrMocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn<(url: string, key: string) => unknown>(),
  createServerClient: vi.fn<(url: string, key: string, options: unknown) => unknown>(),
}));

vi.mock("@supabase/ssr", () => ssrMocks);

const cookieStore = {
  getAll: vi.fn(),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import { createClient as createBrowserClientWrapper } from "@/lib/supabase/client";
import { createClient as createServerClientWrapper } from "@/lib/supabase/server";
import { requireAdminEnv, requirePublicEnv } from "@/lib/supabase/env";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test-key";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("requirePublicEnv", () => {
  it("returns the URL and publishable key when both are set", () => {
    expect(requirePublicEnv()).toEqual({
      url: "https://test-project.supabase.co",
      publishableKey: "sb_publishable_test-key",
    });
  });

  it("throws naming the missing variable when the URL is absent", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => requirePublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("treats an empty publishable key as missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";
    expect(() => requirePublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});

describe("requireAdminEnv", () => {
  it("returns the URL and secret key when both are set", () => {
    expect(requireAdminEnv()).toEqual({
      url: "https://test-project.supabase.co",
      secretKey: "sb_secret_test-key",
    });
  });

  it("throws naming the missing variable when the secret key is absent", () => {
    delete process.env.SUPABASE_SECRET_KEY;
    expect(() => requireAdminEnv()).toThrow(/SUPABASE_SECRET_KEY/);
  });
});

describe("browser client", () => {
  it("constructs with the publishable key, never the secret key", () => {
    createBrowserClientWrapper();
    expect(ssrMocks.createBrowserClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      "sb_publishable_test-key",
    );
    expect(String(ssrMocks.createBrowserClient.mock.calls[0]?.[1])).not.toContain("sb_secret_");
  });

  it("throws before constructing when the env is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => createBrowserClientWrapper()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(ssrMocks.createBrowserClient).not.toHaveBeenCalled();
  });
});

describe("server client cookie adapter", () => {
  async function adapter() {
    await createServerClientWrapper();
    expect(ssrMocks.createServerClient).toHaveBeenCalledTimes(1);
    const options = ssrMocks.createServerClient.mock.calls[0]?.[2] as
      | { cookies?: MockCookieAdapter }
      | undefined;
    if (!options?.cookies) throw new Error("cookie methods not configured");
    return options.cookies;
  }

  it("getAll reads from the awaited cookie store", async () => {
    cookieStore.getAll.mockReturnValue([{ name: "sb-x", value: "1" }]);
    const cookies = await adapter();
    expect(cookies.getAll()).toEqual([{ name: "sb-x", value: "1" }]);
  });

  it("setAll writes every cookie through the store", async () => {
    const cookies = await adapter();
    cookies.setAll([
      { name: "sb-a", value: "1", options: { path: "/" } },
      { name: "sb-b", value: "2", options: { path: "/" } },
    ]);
    expect(cookieStore.set).toHaveBeenCalledTimes(2);
    expect(cookieStore.set).toHaveBeenCalledWith("sb-a", "1", { path: "/" });
  });

  it("setAll swallows errors thrown during Server Component rendering", async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });
    const cookies = await adapter();
    expect(() =>
      cookies.setAll([{ name: "sb-a", value: "1", options: { path: "/" } }]),
    ).not.toThrow();
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: authMocks })),
}));

import { GET } from "@/app/(auth)/callback/route";

describe("auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    authMocks.verifyOtp.mockResolvedValue({ error: null });
  });

  it("verifies an email token hash through the server client and redirects to next", async () => {
    const request = new NextRequest(
      "http://localhost:3000/callback?token_hash=test-token&type=email&next=%2Fdashboard",
    );

    const response = await GET(request);

    expect(authMocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "test-token", type: "email" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("keeps code exchange support for OAuth callbacks", async () => {
    const request = new NextRequest("http://localhost:3000/callback?code=oauth-code&next=%2Fadmin");

    const response = await GET(request);

    expect(authMocks.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
  });
});

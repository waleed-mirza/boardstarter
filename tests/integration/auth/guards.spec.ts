import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedClient, type TestClient } from "../helpers/supabase";

let sessionClient!: TestClient;

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  forbidden: () => {
    throw new Error("forbidden");
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => sessionClient),
}));

import { getOptionalUser, requireAdmin, requireRole } from "@/lib/auth/guards";

describe("auth guards against the cloud Supabase test project", () => {
  beforeEach(async () => {
    sessionClient = await authenticatedClient("employer-a@example.test");
  });

  it("requireRole('admin') rejects a real employer session", async () => {
    await expect(requireRole("admin", "/admin")).rejects.toThrow("redirect:/dashboard");
  });

  it("requireAdmin rejects a real employer session with 403 semantics", async () => {
    await expect(requireAdmin("/admin")).rejects.toThrow("forbidden");
  });

  it("getOptionalUser reads the real employer profile", async () => {
    await expect(getOptionalUser()).resolves.toMatchObject({
      email: "employer-a@example.test",
      role: "employer",
    });
  });
});

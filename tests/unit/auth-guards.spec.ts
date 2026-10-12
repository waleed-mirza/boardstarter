import { beforeEach, describe, expect, it, vi } from "vitest";

// Guards are decision logic: given a session + profile, who gets redirected
// where. Supabase, the profile query, and next/navigation are mocked so the
// table reads exactly like Test Gate 3 item 8.

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  forbidden: () => {
    throw new Error("forbidden");
  },
}));

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: authMocks })),
}));

const profileMocks = vi.hoisted(() => ({
  getProfileById: vi.fn(),
}));

vi.mock("@/lib/data/profiles", () => profileMocks);

import { getOptionalUser, requireAdmin, requireRole, requireUser } from "@/lib/auth/guards";

const EMPLOYER_A = "00000000-0000-4000-8000-00000000000a";
const ADMIN = "00000000-0000-4000-8000-00000000000b";
const COMPANY_A = "00000000-0000-4000-8000-00000000000c";

function sessionFor(userId: string) {
  return { data: { user: userId ? { id: userId, email: `${userId.slice(-1)}@example.test` } : null } };
}

function profileFor(userId: string) {
  if (userId === EMPLOYER_A) {
    return { id: userId, role: "employer" as const, full_name: "Employer A", company_id: COMPANY_A, created_at: "2026-01-01T00:00:00Z" };
  }
  if (userId === ADMIN) {
    return { id: userId, role: "admin" as const, full_name: "Demo Admin", company_id: null, created_at: "2026-01-01T00:00:00Z" };
  }
  return null;
}

async function signedInAs(userId: string | null) {
  authMocks.getUser.mockResolvedValue(sessionFor(userId ?? ""));
  profileMocks.getProfileById.mockImplementation(async (_client: unknown, id: string) =>
    userId ? profileFor(id) : null,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOptionalUser", () => {
  it("returns null when signed out", async () => {
    await signedInAs(null);
    expect(await getOptionalUser()).toBeNull();
  });

  it("maps the auth user plus profile row into a SessionUser", async () => {
    await signedInAs(EMPLOYER_A);
    expect(await getOptionalUser()).toMatchObject({
      id: EMPLOYER_A,
      role: "employer",
      companyId: COMPANY_A,
      fullName: "Employer A",
    });
  });

  it("returns null when the profile row is missing", async () => {
    await signedInAs(EMPLOYER_A);
    profileMocks.getProfileById.mockResolvedValue(null);
    expect(await getOptionalUser()).toBeNull();
  });
});

describe("requireUser / requireRole redirect targets", () => {
  it.each([
    // [session, call, expected redirect or null (= allowed through)]
    [null, () => requireUser("/dashboard"), "/sign-in?next=%2Fdashboard"],
    [null, () => requireRole("employer", "/dashboard"), "/sign-in?next=%2Fdashboard"],
    [null, () => requireRole("admin", "/admin"), "/sign-in?next=%2Fadmin"],
    [null, () => requireUser(), "/sign-in?next=%2Fdashboard"],
    [EMPLOYER_A, () => requireUser("/dashboard"), null],
    [EMPLOYER_A, () => requireRole("employer", "/dashboard"), null],
    [EMPLOYER_A, () => requireRole("admin", "/admin"), "/dashboard"],
    [ADMIN, () => requireRole("admin", "/admin"), null],
    [ADMIN, () => requireRole("employer", "/dashboard"), "/admin"],
    [ADMIN, () => requireUser("/admin"), null],
  ])("%s calling %s redirects to %s", async (userId, call, expected) => {
    await signedInAs(userId);
    if (expected === null) {
      const user = await (call as () => Promise<{ id: string }>)();
      expect(user.id).toBe(userId);
    } else {
      await expect((call as () => Promise<unknown>)()).rejects.toThrow(`redirect:${expected}`);
    }
  });

  it("requireRole('admin') rejects an employer session (gate 3.7 shape)", async () => {
    await signedInAs(EMPLOYER_A);
    await expect(requireRole("admin", "/admin")).rejects.toThrow("redirect:/dashboard");
  });

  it("requireAdmin returns a 403 for employers while still redirecting anonymous users", async () => {
    await signedInAs(EMPLOYER_A);
    await expect(requireAdmin("/admin")).rejects.toThrow("forbidden");
    await signedInAs(null);
    await expect(requireAdmin("/admin")).rejects.toThrow("redirect:/sign-in?next=%2Fadmin");
    await signedInAs(ADMIN);
    await expect(requireAdmin("/admin")).resolves.toMatchObject({ role: "admin" });
  });
});

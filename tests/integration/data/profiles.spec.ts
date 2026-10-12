import { afterEach, describe, expect, it } from "vitest";

import { createCompanyForProfile, getCompanyBySlug } from "@/lib/data/companies";
import { getProfileById, updateProfile } from "@/lib/data/profiles";

import { adminClient, authenticatedClient } from "../helpers/supabase";

const ONBOARDING_EMAIL = "integration-onboarding@example.test";

describe("profiles data layer", () => {
  it("returns the seeded employer profile with its company link", async () => {
    const employer = await authenticatedClient("employer-a@example.test");
    const {
      data: { user: authUser },
    } = await employer.auth.getUser();
    expect(authUser).not.toBeNull();

    const profile = await getProfileById(employer, authUser!.id);
    expect(profile).toMatchObject({
      role: "employer",
      full_name: "Employer A",
      company_id: expect.any(String),
    });
  });

  it("updates the signed-in user's name", async () => {
    const employer = await authenticatedClient("employer-b@example.test");
    const {
      data: { user: authUser },
    } = await employer.auth.getUser();
    const updated = await updateProfile(employer, authUser!.id, {
      full_name: "Employer B (edited)",
    });
    expect(updated.full_name).toBe("Employer B (edited)");
    // Restore the fixture value for other suites.
    await updateProfile(employer, authUser!.id, { full_name: "Employer B" });
  });

  it("onboarding RPC links a company to a fresh user atomically", async () => {
    const admin = adminClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: ONBOARDING_EMAIL,
      password: "DemoPass!234",
      email_confirm: true,
      user_metadata: { full_name: "Integration Onboarding" },
    });
    expect(error).toBeNull();
    const createdId = created?.user?.id;
    expect(createdId).toBeTypeOf("string");

    try {
      const fresh = await authenticatedClient(ONBOARDING_EMAIL);
      const {
        data: { user: authUser },
      } = await fresh.auth.getUser();

      const before = await getProfileById(fresh, authUser!.id);
      expect(before?.company_id).toBeNull();

      const companyId = await createCompanyForProfile(fresh, {
        name: "Integration Test Co",
        website: "https://integration.example.test",
        location: "Remote",
      });
      expect(typeof companyId).toBe("string");

      const after = await getProfileById(fresh, authUser!.id);
      expect(after?.company_id).toBe(companyId);

      // Companies are owner-scoped under RLS until the public board (Week 4).
      const company = await getCompanyBySlug(fresh, "integration-test-co");
      expect(company?.owner_id).toBe(authUser!.id);

      // Second call rejects: one company per profile.
      await expect(
        createCompanyForProfile(fresh, { name: "Second Co" }),
      ).rejects.toThrow(/already linked/);
    } finally {
      // The fixture reset also purges non-fixture users, but do not leak rows
      // into the shared seeded state between runs of this file.
      if (createdId) await admin.auth.admin.deleteUser(createdId);
    }
  });

  afterEach(async () => {
    // Safety net if a test failed before its own cleanup.
    const admin = adminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const stray = data.users.find((u) => u.email === ONBOARDING_EMAIL);
    if (stray) await admin.auth.admin.deleteUser(stray.id);
  });
});

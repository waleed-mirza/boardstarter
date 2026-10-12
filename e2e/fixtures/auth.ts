import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/types";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export const AUTH_USERS = {
  employerA: { email: "employer-a@example.test" },
  employerB: { email: "employer-b@example.test" },
  admin: { email: "admin@example.test" },
} as const;

export type AuthFixtureRole = keyof typeof AUTH_USERS;

const authDirectory = join(process.cwd(), "e2e", ".auth");

export const AUTH_STATE_PATHS = {
  anonymous: join(authDirectory, "anonymous.json"),
  employerA: join(authDirectory, "employer-a.json"),
  employerB: join(authDirectory, "employer-b.json"),
  admin: join(authDirectory, "admin.json"),
} as const;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for auth E2E fixtures`);
  return value;
}

function testOrigin(): string {
  return (
    process.env.E2E_EXTERNAL_BASE_URL ??
    process.env.BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function adminClient() {
  // Test setup only: RLS cannot create, generate links for, or remove auth.users.
  return createClient<Database>(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function cleanupEmployerData(userId: string): Promise<void> {
  const client = adminClient();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(`Could not inspect fixture profile: ${profileError.message}`);
  if (!profile?.company_id) return;

  const { data: jobs, error: jobsError } = await client
    .from("jobs")
    .select("id")
    .eq("company_id", profile.company_id);
  if (jobsError) throw new Error(`Could not inspect fixture jobs: ${jobsError.message}`);
  const jobIds = (jobs ?? []).map((job) => job.id);
  if (jobIds.length > 0) {
    const { error: eventsError } = await client
      .from("payment_webhook_events")
      .delete()
      .in("job_id", jobIds);
    if (eventsError) throw new Error(`Could not clean fixture webhook events: ${eventsError.message}`);
    const { error: ordersError } = await client.from("orders").delete().in("job_id", jobIds);
    if (ordersError) throw new Error(`Could not clean fixture orders: ${ordersError.message}`);
  }
  const { error: companyError } = await client
    .from("companies")
    .delete()
    .eq("id", profile.company_id);
  if (companyError) throw new Error(`Could not clean fixture company: ${companyError.message}`);
}

function callbackUrl(nextPath: string): string {
  const callback = new URL("/callback", testOrigin());
  callback.searchParams.set("next", nextPath);
  return callback.toString();
}

type GeneratedMagicLink = {
  actionLink: string;
  tokenHash: string;
  tokenType: string;
};

async function generateMagicLinkData(
  email: string,
  nextPath = "/dashboard",
): Promise<GeneratedMagicLink> {
  const { data, error } = await adminClient().auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: callbackUrl(nextPath) },
  });
  if (error) throw new Error(`Could not generate a test magic link: ${error.message}`);

  const actionLink = data.properties?.action_link;
  const tokenHash = data.properties?.hashed_token;
  const tokenType = data.properties?.verification_type;
  if (!actionLink || !tokenHash || !tokenType)
    throw new Error("Supabase did not return a test magic link");
  return { actionLink, tokenHash, tokenType };
}

/** Creates a deterministic cloud-Supabase verification link for browser tests. */
export async function generateMagicLink(email: string, nextPath = "/dashboard"): Promise<string> {
  return (await generateMagicLinkData(email, nextPath)).actionLink;
}

/** Exercises the real sign-in form while replacing only the unavailable email transport. */
export async function requestMagicLinkFromUi(
  page: import("@playwright/test").Page,
  email: string,
  nextPath = "/dashboard",
): Promise<void> {
  const signIn = new URL("/sign-in", testOrigin());
  signIn.searchParams.set("next", nextPath);
  const otpEndpoint = "**/auth/v1/otp**";
  const fulfillOtp = async (route: import("@playwright/test").Route): Promise<void> => {
    const origin = route.request().headers().origin ?? testOrigin();
    const corsHeaders = {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers":
        "apikey, authorization, content-type, x-client-info, x-supabase-api-version",
      "access-control-allow-methods": "POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: "application/json",
      body: "{}",
    });
  };
  await page.route(otpEndpoint, fulfillOtp);
  try {
    await page.goto(signIn.toString());
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.waitForURL(/\/verify\?email=/);
  } finally {
    if (!page.isClosed()) {
      await page.unroute(otpEndpoint, fulfillOtp);
    }
  }
}

export async function signInAndSaveState(
  page: import("@playwright/test").Page,
  user: { email: string },
  outputPath: string,
  nextPath: string,
  expectedHeading: string,
): Promise<void> {
  await completeMagicLink(page, user.email, nextPath);
  await page.getByRole("heading", { name: expectedHeading }).waitFor();
  await mkdir(authDirectory, { recursive: true });
  await page.context().storageState({ path: outputPath });
}

/** Generates a cloud token and resolves it through the local server callback. */
export async function completeMagicLink(
  page: import("@playwright/test").Page,
  email: string,
  nextPath = "/dashboard",
): Promise<void> {
  const { tokenHash, tokenType } = await generateMagicLinkData(email, nextPath);
  const callback = new URL("/callback", testOrigin());
  callback.searchParams.set("token_hash", tokenHash);
  callback.searchParams.set("type", tokenType);
  callback.searchParams.set("next", nextPath);
  await page.goto(callback.toString());
}

export type UnonboardedFixture = {
  id: string;
  email: string;
  suffix: string;
  cleanup: () => Promise<void>;
};

/** Creates a temporary, confirmed employer whose profile has no company. */
export async function createUnonboardedUser(): Promise<UnonboardedFixture> {
  const client = adminClient();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `e2e-onboarding-${suffix}@example.test`;
  const password = `E2e-${suffix}-Aa1!`;
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { seed_source: "fixture-test" },
    user_metadata: { full_name: "E2E New Employer" },
  });
  if (error) throw new Error(`Could not create onboarding fixture: ${error.message}`);
  if (!data.user) throw new Error("Supabase did not return the onboarding fixture user");

  return {
    id: data.user.id,
    email,
    suffix,
    cleanup: async () => {
      await cleanupEmployerData(data.user.id);
      const { error: deleteError } = await client.auth.admin.deleteUser(data.user.id);
      if (deleteError)
        throw new Error(`Could not clean up onboarding fixture: ${deleteError.message}`);
    },
  };
}

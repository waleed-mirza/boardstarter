import "server-only";

import { forbidden, redirect } from "next/navigation";

import { getProfileById } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "employer" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  companyId: string | null;
};

/**
 * Route guards (§Week 3 task 5): server-only, redirecting rather than
 * throwing. Guards are the only auth decision point for pages — proxy.ts
 * refreshes sessions but never decides access.
 */

export async function getOptionalUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileById(supabase, user.id);
  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role,
    fullName: profile.full_name,
    companyId: profile.company_id,
  };
}

function redirectToSignIn(next: string): never {
  redirect(`/sign-in?next=${encodeURIComponent(next)}`);
}

export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) redirectToSignIn(next);
  return user;
}

const ROLE_HOME: Record<UserRole, string> = {
  employer: "/dashboard",
  admin: "/admin",
};

export async function requireRole(
  role: UserRole,
  next = ROLE_HOME[role],
): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) redirectToSignIn(next);
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}

/**
 * Admin boundary for Week 7 routes and Server Actions. Keep the generic
 * requireRole redirect behavior for the employer surface; admin access is a
 * distinct permission boundary and must render a 403 for authenticated
 * employers.
 */
export async function requireAdmin(next = "/admin"): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) redirectToSignIn(next);
  if (user.role !== "admin") forbidden();
  return user;
}

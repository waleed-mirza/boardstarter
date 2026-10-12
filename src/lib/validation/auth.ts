import { z } from "zod";

/**
 * Auth + onboarding schemas (§6: one schema per entity, shared client/server).
 * `parseNextParam` is the open-redirect guard for post-sign-in redirects —
 * every `?next=` value read from a URL must go through it.
 */

const optionalIfEmpty = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(120, "Company name must be 120 characters or fewer"),
  website: optionalIfEmpty(z.url("Enter a valid URL")),
  location: optionalIfEmpty(z.string().trim().max(120)),
  description: optionalIfEmpty(z.string().trim().max(2000)),
});

export type CompanyInput = z.infer<typeof companySchema>;

/** Account settings: the name field only. Empty clears the display name. */
export const profileUpdateSchema = z.object({
  fullName: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(120, "Name must be 120 characters or fewer").nullable(),
  ),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** Same-origin paths only: leading slash, no protocol/backslash tricks. */
export function parseNextParam(
  raw: string | string[] | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}

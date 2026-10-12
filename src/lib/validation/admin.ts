import { z } from "zod";

const uuid = z.string().uuid();
const slug = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const adminJobFiltersSchema = z.object({
  query: z.string().trim().max(120).default(""),
  status: z.enum(["all", "draft", "pending_review", "published", "rejected", "expired"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
});

export const jobRejectionSchema = z.object({
  jobId: uuid,
  reason: z.string().trim().min(3, "A rejection reason is required.").max(2000),
});

export const jobIdSchema = z.object({ jobId: uuid });
export const jobFeaturedSchema = z.object({ jobId: uuid, featured: z.boolean() });
export const jobExtensionSchema = z.object({ jobId: uuid, days: z.number().int().min(1).max(365) });

export const packageInputSchema = z.object({
  id: uuid.nullable().optional(),
  name: z.string().trim().min(1).max(80),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  durationDays: z.number().int().positive().max(3650),
  isFeatured: z.boolean(),
  lsVariantId: z.string().trim().min(1).max(160),
  isActive: z.boolean(),
  sort: z.number().int().min(0).max(10000),
});

export const taxonomyCategorySchema = z.object({
  id: uuid.nullable().optional(),
  name: z.string().trim().min(1).max(80),
  slug,
  description: z.string().trim().max(500).nullable(),
  sort: z.number().int().min(0).max(10000),
});

export const taxonomyTagSchema = z.object({
  id: uuid.nullable().optional(),
  name: z.string().trim().min(1).max(60),
  slug: slug.max(60),
});

export const taxonomyMergeSchema = z.object({ sourceId: uuid, targetId: uuid });
export const taxonomyDeleteSchema = z.object({ id: uuid, reassignTo: uuid.nullable().optional() });

const footerLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(500),
});

export const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(120),
  tagline: z.string().trim().min(1).max(240),
  logoUrl: z.string().trim().refine((value) => !value || value.startsWith("https://"), "Logo URL must use HTTPS."),
  accent: z.enum(["blue", "violet", "green", "amber"]),
  preset: z.enum(["remote", "ai", "local", "community"]),
  defaultCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  allowedApplyModes: z.array(z.enum(["url", "email", "onsite"])).min(1),
  autoPublishOnPayment: z.boolean(),
  alertFrequency: z.enum(["daily", "weekly"]),
  pseoMinimumLiveJobs: z.number().int().min(1).max(1000),
  footerLinks: z.array(footerLinkSchema).max(12),
  analyticsSnippet: z.string().trim().max(2000),
});

export type AdminJobFilters = z.infer<typeof adminJobFiltersSchema>;
export type PackageInput = z.infer<typeof packageInputSchema>;
export type CategoryInput = z.infer<typeof taxonomyCategorySchema>;
export type TagInput = z.infer<typeof taxonomyTagSchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

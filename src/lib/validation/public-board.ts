import { z } from "zod";

const employmentType = z.enum(["full_time", "part_time", "contract", "temporary", "internship"]);
const applyMode = z.enum(["url", "email", "onsite"]);
const jobStatus = z.enum(["draft", "pending_review", "published", "rejected", "expired"]);

const publicJobFields = {
  id: z.string(),
  company_id: z.string(),
  title: z.string(),
  slug: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  category_slug: z.string(),
  employment_type: employmentType,
  location: z.string().nullable(),
  is_remote: z.boolean(),
  remote_region: z.string().nullable(),
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  currency: z.string(),
  salary_period: z.string(),
  is_featured: z.boolean(),
  published_at: z.string(),
  expires_at: z.string(),
  created_at: z.string(),
  company_name: z.string(),
  company_slug: z.string(),
  company_logo_url: z.string().nullable(),
  tag_slugs: z.array(z.string()),
};

export const publicJobListItemSchema = z.object({
  ...publicJobFields,
  effective_featured: z.boolean(),
});

export const publicJobDetailSchema = z.object({
  ...publicJobFields,
  description_md: z.string(),
  apply_mode: applyMode,
  apply_url: z.string().nullable(),
  apply_email: z.string().nullable(),
  company_website: z.string().nullable(),
  company_description: z.string().nullable(),
  company_location: z.string().nullable(),
  updated_at: z.string(),
  status: jobStatus,
  is_expired: z.boolean(),
  as_of: z.string(),
});

export const publicJobListPayloadSchema = z.object({
  data: z.array(publicJobListItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  asOf: z.string(),
});

export const publicFacetOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export const publicJobFacetPayloadSchema = z.object({
  categories: z.array(publicFacetOptionSchema),
  employmentTypes: z.array(publicFacetOptionSchema),
  workModes: z.array(publicFacetOptionSchema),
  locations: z.array(publicFacetOptionSchema),
  tags: z.array(publicFacetOptionSchema),
  salaryBands: z.array(publicFacetOptionSchema),
});

export const publicCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo_url: z.string().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  live_job_count: z.number().int().nonnegative(),
});

export const publicBoardStatsSchema = z.object({
  jobCount: z.number().int().nonnegative(),
  companyCount: z.number().int().nonnegative(),
  latestPublishedAt: z.string().nullable(),
  asOf: z.string(),
});

export const publicSeoJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description_md: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  category_slug: z.string(),
  employment_type: employmentType,
  location: z.string().nullable(),
  is_remote: z.boolean(),
  remote_region: z.string().nullable(),
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  currency: z.string(),
  salary_period: z.string(),
  apply_mode: applyMode,
  apply_url: z.string().nullable(),
  apply_email: z.string().nullable(),
  published_at: z.string(),
  expires_at: z.string(),
  updated_at: z.string(),
  company_name: z.string(),
  company_slug: z.string(),
  company_logo_url: z.string().nullable(),
  company_website: z.string().nullable(),
  company_location: z.string().nullable(),
  tag_slugs: z.array(z.string()),
});

export const publicSeoCatalogSchema = z.object({
  jobs: z.array(publicSeoJobSchema),
  latestPublishedAt: z.string().nullable(),
});

export type PublicJobListRpcItem = z.infer<typeof publicJobListItemSchema>;
export type PublicJobDetailRpc = z.infer<typeof publicJobDetailSchema>;
export type PublicJobListRpcPayload = z.infer<typeof publicJobListPayloadSchema>;
export type PublicJobFacetRpcPayload = z.infer<typeof publicJobFacetPayloadSchema>;
export type PublicCompanyRpc = z.infer<typeof publicCompanySchema>;
export type PublicBoardStatsRpc = z.infer<typeof publicBoardStatsSchema>;
export type PublicSeoJobRpc = z.infer<typeof publicSeoJobSchema>;
export type PublicSeoCatalogRpc = z.infer<typeof publicSeoCatalogSchema>;

export function parsePublicJobListPayload(value: unknown): PublicJobListRpcPayload {
  return publicJobListPayloadSchema.parse(value);
}

export function parsePublicJobDetail(value: unknown): PublicJobDetailRpc | null {
  if (value === null) return null;
  return publicJobDetailSchema.parse(value);
}

export function parsePublicFacetPayload(value: unknown): PublicJobFacetRpcPayload {
  return publicJobFacetPayloadSchema.parse(value);
}

export function parsePublicCompanies(value: unknown): PublicCompanyRpc[] {
  return z.array(publicCompanySchema).parse(value);
}

export function parsePublicCompany(value: unknown): PublicCompanyRpc | null {
  if (value === null) return null;
  return publicCompanySchema.parse(value);
}

export function parsePublicBoardStats(value: unknown): PublicBoardStatsRpc {
  return publicBoardStatsSchema.parse(value);
}

export function parsePublicSeoCatalog(value: unknown): PublicSeoCatalogRpc {
  return publicSeoCatalogSchema.parse(value);
}

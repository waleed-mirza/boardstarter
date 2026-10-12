import type { DatabaseClient, CompanyRow } from "./types";
import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/server";
import {
  parsePublicCompanies,
  parsePublicCompany,
  type PublicCompanyRpc,
} from "@/lib/validation/public-board";

export type CompanySummary = CompanyRow;

export type PublicCompany = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
  location: string | null;
  liveJobCount: number;
};

function toPublicCompany(company: PublicCompanyRpc): PublicCompany {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    logoUrl: company.logo_url,
    website: company.website,
    description: company.description,
    location: company.location,
    liveJobCount: company.live_job_count,
  };
}

/**
 * Atomic onboarding RPC (migration 20260906200000): inserts the company and
 * links profiles.company_id in one call. Rejects a second company per
 * profile; slugs are derived server-side, never trusted from the client.
 */
export async function createCompanyForProfile(
  client: DatabaseClient,
  input: { name: string; website?: string; location?: string; description?: string },
): Promise<string> {
  const { data, error } = await client.rpc("create_company_for_profile", {
    p_name: input.name,
    p_website: input.website ?? null,
    p_location: input.location ?? null,
    p_description: input.description ?? null,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("create_company_for_profile returned no id");
  return data;
}

export async function getCompanyBySlug(
  client: DatabaseClient,
  slug: string,
): Promise<CompanySummary | null> {
  const { data, error } = await client.from("companies").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCompanyById(
  client: DatabaseClient,
  id: string,
): Promise<CompanySummary | null> {
  const { data, error } = await client.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function queryPublicCompanyBySlug(
  client: DatabaseClient,
  slug: string,
): Promise<PublicCompany | null> {
  const { data, error } = await client.rpc("get_public_company_by_slug", { p_slug: slug });
  if (error) throw new Error(error.message);
  const company = parsePublicCompany(data);
  return company ? toPublicCompany(company) : null;
}

export async function getPublicCompanyBySlug(slug: string): Promise<PublicCompany | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return queryPublicCompanyBySlug(await createPublicClient(), slug);
}

export async function queryPublicCompanies(client: DatabaseClient): Promise<PublicCompany[]> {
  const { data, error } = await client.rpc("list_public_companies");
  if (error) throw new Error(error.message);
  return parsePublicCompanies(data).map(toPublicCompany);
}

export async function listPublicCompanies(): Promise<PublicCompany[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("jobs");
  return queryPublicCompanies(createPublicClient());
}

/** Owner-editable columns only — unlimited_until stays server-side (§0.2). */
export async function updateCompany(
  client: DatabaseClient,
  id: string,
  values: Pick<CompanyRow, "name"> & Partial<Pick<CompanyRow, "website" | "location" | "description">>,
): Promise<CompanySummary> {
  const { data, error } = await client
    .from("companies")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCompanyLogo(
  client: DatabaseClient,
  id: string,
  logoUrl: string,
): Promise<CompanySummary> {
  const { data, error } = await client
    .from("companies")
    .update({ logo_url: logoUrl })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

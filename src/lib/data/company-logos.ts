import { getCompanyById, updateCompanyLogo } from "@/lib/data/companies";
import type { CompanyLogoMetadata } from "@/lib/uploads/company-logo";

import type { DatabaseClient } from "./types";

const BUCKET = "company-logos";

function oldObjectPath(logoUrl: string | null): string | null {
  if (!logoUrl) return null;
  try {
    const url = new URL(logoUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    return index === -1 ? null : decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export async function uploadCompanyLogo(
  client: DatabaseClient,
  userId: string,
  companyId: string,
  file: File,
  metadata: CompanyLogoMetadata,
): Promise<string> {
  const company = await getCompanyById(client, companyId);
  if (!company || company.owner_id !== userId) throw new Error("Company not found");

  const path = `${userId}/${crypto.randomUUID()}.${metadata.extension}`;
  const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, {
    contentType: metadata.mimeType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  try {
    await updateCompanyLogo(client, companyId, data.publicUrl);
  } catch (error) {
    await client.storage.from(BUCKET).remove([path]);
    throw error;
  }

  const previousPath = oldObjectPath(company.logo_url);
  if (previousPath && previousPath !== path) {
    await client.storage.from(BUCKET).remove([previousPath]);
  }
  return data.publicUrl;
}

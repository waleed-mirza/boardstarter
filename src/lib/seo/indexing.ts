import "server-only";

import { GoogleAuth } from "google-auth-library";

export type GoogleIndexingType = "URL_UPDATED" | "URL_DELETED";

function credentialsFromEnv(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_INDEXING_SA_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

/** Best-effort Google for Jobs notification; disabled when no service account is configured. */
export async function submitGoogleIndexing(
  url: string,
  type: GoogleIndexingType,
): Promise<boolean> {
  const credentials = credentialsFromEnv();
  if (!credentials) return false;
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  const client = await auth.getClient();
  await client.request({
    url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
    method: "POST",
    data: { url, type },
  });
  return true;
}

export async function submitGoogleIndexingBestEffort(
  url: string,
  type: GoogleIndexingType,
): Promise<void> {
  try {
    await submitGoogleIndexing(url, type);
  } catch (error) {
    console.warn(
      JSON.stringify({
        scope: "google_indexing",
        type,
        result: "error",
        message: error instanceof Error ? error.message : "request failed",
      }),
    );
  }
}

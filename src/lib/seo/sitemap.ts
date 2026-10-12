export type SitemapEntry = {
  url: string;
  lastModified: string | Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export function buildSitemap(entries: SitemapEntry[]): SitemapEntry[] {
  return entries
    .filter((entry) => entry.url.length > 0)
    .map((entry) => ({ ...entry, lastModified: entry.lastModified }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

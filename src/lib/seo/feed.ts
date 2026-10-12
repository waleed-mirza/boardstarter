export type RssFeedItem = {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  companyName: string;
  categoryName: string;
};

export type RssFeedInput = {
  title: string;
  description: string;
  url: string;
  items: RssFeedItem[];
  updatedAt?: string | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRssFeed(input: RssFeedInput): string {
  const updated = input.updatedAt ?? input.items[0]?.publishedAt ?? new Date(0).toISOString();
  const items = input.items
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <category>${escapeXml(item.categoryName)}</category>
      <author>${escapeXml(item.companyName)}</author>
    </item>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(input.title)}</title>
    <link>${escapeXml(input.url)}</link>
    <description>${escapeXml(input.description)}</description>
    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;
}

export { escapeXml };

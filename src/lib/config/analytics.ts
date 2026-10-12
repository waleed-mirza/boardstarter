export type AnalyticsConfig = {
  src: string;
  websiteId?: string;
  domain?: string;
};

/**
 * Accept only a tiny, external-script subset of an analytics snippet. Admins
 * can configure their own analytics provider without gaining an inline script
 * or event-handler injection point.
 */
export function parseAnalyticsSnippet(value: string): AnalyticsConfig | null {
  const source = value.trim();
  if (!source) return null;
  const script = source.match(/^<script\b([^>]*)>\s*<\/script>$/i);
  if (!script?.[1] || /[<>{}]|on[a-z]+\s*=|javascript:/i.test(script[1])) return null;
  const attributes = new Map<string, string>();
  const attributePattern = /([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  for (const match of script[1].matchAll(attributePattern)) {
    const name = match[1]?.toLowerCase();
    const attributeValue = match[2] ?? match[3];
    if (name && attributeValue) attributes.set(name, attributeValue);
  }
  const src = attributes.get("src");
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return null;
  } catch {
    return null;
  }
  const websiteId = attributes.get("data-website-id");
  const domain = attributes.get("data-domain");
  return { src, ...(websiteId ? { websiteId } : {}), ...(domain ? { domain } : {}) };
}


import type { Metadata } from "next";

export type MetadataInput = {
  siteUrl: string;
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
};

export function canonicalUrl(siteUrl: string, path: string): string {
  return new URL(path.startsWith("/") ? path : `/${path}`, siteUrl).toString();
}

export function buildPageMetadata(input: MetadataInput): Metadata {
  const url = canonicalUrl(input.siteUrl, input.path);
  const image = input.image ? canonicalUrl(input.siteUrl, input.image) : undefined;
  const result: Metadata = {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: input.title,
      description: input.description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: input.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      ...(image ? { images: [image] } : {}),
    },
    robots: input.noindex ? { index: false, follow: true } : { index: true, follow: true },
  };
  return result;
}

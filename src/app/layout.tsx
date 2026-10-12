import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCachedPublicSiteConfig } from "@/lib/data/settings";
import { parseAnalyticsSnippet } from "@/lib/config/analytics";

import "@/styles/globals.css";

const geistSans = localFont({
  src: "../fonts/geist-sans-var.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../fonts/geist-mono-var.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getCachedPublicSiteConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(siteUrl),
    title: config.siteName,
    description: config.tagline,
    robots: { index: true, follow: true },
  };
}

// Sets the theme class before first paint so there is no flash of the wrong
// theme. Kept in sync with src/components/layout/theme-toggle.tsx.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const config = await getCachedPublicSiteConfig();
  const analytics = parseAnalyticsSnippet(config.analyticsSnippet);
  return (
    <html
      lang="en"
      data-accent={config.accent}
      data-preset={config.preset}
      className={`${geistSans.variable} ${geistMono.variable} h-full font-sans antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        {analytics ? (
          <Script
            id="site-analytics"
            src={analytics.src}
            strategy="afterInteractive"
            {...(analytics.websiteId ? { "data-website-id": analytics.websiteId } : {})}
            {...(analytics.domain ? { "data-domain": analytics.domain } : {})}
          />
        ) : null}
      </body>
    </html>
  );
}

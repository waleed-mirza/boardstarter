import type { Json } from "@/lib/supabase/types";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { getPreset, parsePresetId, type PresetAccent, type PresetId } from "@/lib/config/presets";

import type { DatabaseClient } from "./types";
import { requireData, toSettings } from "./types";

export type PublicSiteConfig = {
  siteName: string;
  tagline: string;
  logoUrl: string | null;
  accent: PresetAccent;
  preset: PresetId;
  defaultCurrency: string;
  allowedApplyModes: ("url" | "email" | "onsite")[];
  autoPublishOnPayment: boolean;
  alertFrequency: "daily" | "weekly";
  pseoMinimumLiveJobs: number;
  footerLinks: { label: string; href: string }[];
  analyticsSnippet: string;
};

export const DEFAULT_SITE_CONFIG: PublicSiteConfig = {
  siteName: getPreset("remote").siteName,
  tagline: getPreset("remote").tagline,
  logoUrl: null,
  accent: "blue",
  preset: "remote",
  defaultCurrency: "USD",
  allowedApplyModes: ["url", "email", "onsite"],
  autoPublishOnPayment: true,
  alertFrequency: "weekly",
  pseoMinimumLiveJobs: 3,
  footerLinks: [],
  analyticsSnippet: "",
};

export async function getSiteSettings(client: DatabaseClient): Promise<Record<string, Json>> {
  const { data, error } = await client.from("site_settings").select("*");
  return toSettings(requireData(data, error));
}

export async function getSiteSetting(client: DatabaseClient, key: string): Promise<Json | null> {
  const { data, error } = await client
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

function asString(value: Json | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asOptionalUrl(value: Json | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function asBoolean(value: Json | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asEnum<T extends string>(value: Json | undefined, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function asApplyModes(value: Json | undefined): PublicSiteConfig["allowedApplyModes"] {
  if (!Array.isArray(value)) return DEFAULT_SITE_CONFIG.allowedApplyModes;
  const modes = value.filter(
    (item): item is PublicSiteConfig["allowedApplyModes"][number] =>
      typeof item === "string" && ["url", "email", "onsite"].includes(item),
  );
  return modes.length > 0 ? [...new Set(modes)] : DEFAULT_SITE_CONFIG.allowedApplyModes;
}

export function toPublicSiteConfig(settings: Record<string, Json>): PublicSiteConfig {
  const envPreset = parsePresetId(process.env.NEXT_PUBLIC_PRESET);
  const preset = parsePresetId(settings.preset, envPreset);
  const presetDefaults = getPreset(preset);
  const rawLinks = settings.footer_links;
  const footerLinks = Array.isArray(rawLinks)
    ? rawLinks.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const label = item.label;
        const href = item.href;
        return typeof label === "string" && typeof href === "string" ? [{ label, href }] : [];
      })
    : DEFAULT_SITE_CONFIG.footerLinks;
  return {
    siteName: asString(settings.site_name, presetDefaults.siteName),
    tagline: asString(settings.tagline, presetDefaults.tagline),
    logoUrl: asOptionalUrl(settings.logo_url),
    accent: asEnum(
      settings.accent,
      ["blue", "violet", "green", "amber"],
      presetDefaults.accent,
    ),
    preset: asEnum(
      settings.preset,
      ["remote", "ai", "local", "community"],
      envPreset,
    ),
    defaultCurrency: asString(settings.default_currency, DEFAULT_SITE_CONFIG.defaultCurrency),
    allowedApplyModes: asApplyModes(settings.allowed_apply_modes),
    autoPublishOnPayment: asBoolean(
      settings.auto_publish_on_payment,
      DEFAULT_SITE_CONFIG.autoPublishOnPayment,
    ),
    alertFrequency: asEnum(
      settings.alert_frequency,
      ["daily", "weekly"],
      DEFAULT_SITE_CONFIG.alertFrequency,
    ),
    pseoMinimumLiveJobs:
      typeof settings.pseo_min_live_jobs === "number" &&
      Number.isInteger(settings.pseo_min_live_jobs) &&
      settings.pseo_min_live_jobs > 0
        ? settings.pseo_min_live_jobs
        : DEFAULT_SITE_CONFIG.pseoMinimumLiveJobs,
    footerLinks,
    analyticsSnippet:
      typeof settings.analytics_snippet === "string"
        ? settings.analytics_snippet
        : DEFAULT_SITE_CONFIG.analyticsSnippet,
  };
}

export async function getPublicSiteConfig(client: DatabaseClient): Promise<PublicSiteConfig> {
  return toPublicSiteConfig(await getSiteSettings(client));
}

export async function getCachedPublicSiteConfig(): Promise<PublicSiteConfig> {
  "use cache";
  cacheLife("minutes");
  cacheTag("site-settings");
  return getPublicSiteConfig(createPublicClient());
}

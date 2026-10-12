import type { Json } from "@/lib/supabase/types";

export const PRESET_IDS = ["remote", "ai", "local", "community"] as const;
export type PresetId = (typeof PRESET_IDS)[number];
export type PresetAccent = "blue" | "violet" | "green" | "amber";

export type PresetCategory = {
  name: string;
  slug: string;
  description: string;
  sort: number;
};

export type PresetDefinition = {
  id: PresetId;
  siteName: string;
  tagline: string;
  accent: PresetAccent;
  categories: readonly PresetCategory[];
  emailAccent: string;
  emailAccentText: string;
};

const COMMON_CATEGORIES: Record<string, PresetCategory> = {
  software: {
    name: "Software Engineering",
    slug: "software-engineering",
    description: "Product and platform engineering roles.",
    sort: 10,
  },
  data: {
    name: "Data",
    slug: "data",
    description: "Data science, analytics, and machine learning roles.",
    sort: 40,
  },
  design: {
    name: "Design",
    slug: "design",
    description: "Product, brand, and user experience design roles.",
    sort: 30,
  },
  product: {
    name: "Product",
    slug: "product",
    description: "Product management and operations roles.",
    sort: 40,
  },
  operations: {
    name: "Operations",
    slug: "operations",
    description: "Business, people, and revenue operations roles.",
    sort: 50,
  },
  marketing: {
    name: "Marketing",
    slug: "marketing",
    description: "Growth, content, and lifecycle marketing roles.",
    sort: 60,
  },
  sales: {
    name: "Sales",
    slug: "sales",
    description: "Account executive, partnerships, and sales engineering roles.",
    sort: 70,
  },
  community: {
    name: "Community",
    slug: "community",
    description: "Community, customer success, and support roles.",
    sort: 80,
  },
};

function category(key: string): PresetCategory {
  const value = COMMON_CATEGORIES[key];
  if (!value) throw new Error(`Unknown preset category: ${key}`);
  return value;
}

export const PRESETS: Record<PresetId, PresetDefinition> = {
  remote: {
    id: "remote",
    siteName: "Remote Work Exchange",
    tagline: "Thoughtful jobs for teams building what is next.",
    accent: "blue",
    categories: [
      category("software"),
      category("design"),
      category("product"),
      category("data"),
    ],
    emailAccent: "#2764d8",
    emailAccentText: "#ffffff",
  },
  ai: {
    id: "ai",
    siteName: "Applied Intelligence Jobs",
    tagline: "Roles for people building useful, responsible intelligence.",
    accent: "violet",
    categories: [category("data"), category("software"), category("product")],
    emailAccent: "#7a42c6",
    emailAccentText: "#ffffff",
  },
  local: {
    id: "local",
    siteName: "Local Work Exchange",
    tagline: "Good work with teams rooted in your place.",
    accent: "green",
    categories: [
      category("operations"),
      category("sales"),
      category("design"),
      category("community"),
    ],
    emailAccent: "#16845a",
    emailAccentText: "#ffffff",
  },
  community: {
    id: "community",
    siteName: "Community Work Exchange",
    tagline: "Find work with teams that invest in people and place.",
    accent: "amber",
    categories: [
      category("community"),
      category("operations"),
      category("marketing"),
      category("sales"),
    ],
    emailAccent: "#b26b00",
    emailAccentText: "#ffffff",
  },
};

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === "string" && (PRESET_IDS as readonly string[]).includes(value);
}

export function parsePresetId(value: Json | string | undefined, fallback: PresetId = "remote"): PresetId {
  return isPresetId(value) ? value : fallback;
}

export function getPreset(id: PresetId): PresetDefinition {
  return PRESETS[id];
}

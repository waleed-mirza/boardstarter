import { describe, expect, it } from "vitest";

import { getPreset, isPresetId, parsePresetId, PRESETS, PRESET_IDS } from "@/lib/config/presets";
import { toPublicSiteConfig } from "@/lib/data/settings";
import { getEmailTheme } from "@/lib/email/theme";

describe("presets", () => {
  it("defines four complete presets", () => {
    expect(PRESET_IDS).toEqual(["remote", "ai", "local", "community"]);
    for (const id of PRESET_IDS) {
      const preset = PRESETS[id];
      expect(preset.siteName).not.toMatch(/boardstarter/i);
      expect(preset.tagline).not.toMatch(/boardstarter/i);
      expect(preset.categories.length).toBeGreaterThanOrEqual(3);
      expect(preset.emailAccent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("rejects unknown preset ids and falls back safely", () => {
    expect(isPresetId("ai")).toBe(true);
    expect(isPresetId("unknown")).toBe(false);
    expect(parsePresetId("unknown", "local")).toBe("local");
    expect(getPreset("community").accent).toBe("amber");
  });

  it("projects the preset accent into email-safe theme values", () => {
    expect(getEmailTheme("ai").accent).toBe(PRESETS.ai.emailAccent);
    expect(getEmailTheme("community").accent).toBe(PRESETS.community.emailAccent);
  });

  it("uses the database preset while retaining env fallback behavior", () => {
    const original = process.env.NEXT_PUBLIC_PRESET;
    process.env.NEXT_PUBLIC_PRESET = "ai";
    expect(toPublicSiteConfig({}).preset).toBe("ai");
    expect(toPublicSiteConfig({}).siteName).toBe("Applied Intelligence Jobs");
    expect(toPublicSiteConfig({ preset: "local" }).preset).toBe("local");
    expect(toPublicSiteConfig({ preset: "local" }).accent).toBe("green");
    if (original === undefined) delete process.env.NEXT_PUBLIC_PRESET;
    else process.env.NEXT_PUBLIC_PRESET = original;
  });
});

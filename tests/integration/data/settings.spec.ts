import { describe, expect, it } from "vitest";

import {
  getPublicSiteConfig,
  getSiteSetting,
  getSiteSettings,
  toPublicSiteConfig,
} from "@/lib/data/settings";

import { anonClient } from "../helpers/supabase";

describe("settings data layer", () => {
  it("returns the public settings map and individual values", async () => {
    const client = anonClient();
    const settings = await getSiteSettings(client);
    expect(Object.keys(settings)).toEqual(
      expect.arrayContaining([
        "site_name",
        "tagline",
        "logo_url",
        "accent",
        "preset",
        "default_currency",
        "allowed_apply_modes",
        "auto_publish_on_payment",
        "alert_frequency",
        "pseo_min_live_jobs",
        "footer_links",
        "analytics_snippet",
      ]),
    );
    expect(settings.site_name).toBe("Remote Work Exchange");
    await expect(getSiteSetting(client, "tagline")).resolves.toBe(
      "Thoughtful jobs for teams building what is next.",
    );
    await expect(getSiteSetting(client, "missing")).resolves.toBeNull();
  });

  it("normalizes public settings with safe defaults", async () => {
    await expect(getPublicSiteConfig(anonClient())).resolves.toMatchObject({
      siteName: "Remote Work Exchange",
      defaultCurrency: "USD",
      pseoMinimumLiveJobs: 3,
    });
    expect(toPublicSiteConfig({ site_name: "  " })).toMatchObject({
      siteName: "Remote Work Exchange",
      footerLinks: [],
    });
  });
});

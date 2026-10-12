import type pg from "pg";

import { getPreset, parsePresetId } from "../../src/lib/config/presets";

/** Applies preset categories and public settings without creating duplicates. */
export async function applyPresetDefaults(client: pg.Client, requested?: string): Promise<string> {
  const preset = getPreset(parsePresetId(requested));
  await client.query("BEGIN");
  try {
    for (const category of preset.categories) {
      await client.query(
        `insert into public.categories (name, slug, description, sort)
         values ($1, $2, $3, $4)
         on conflict (slug) do nothing`,
        [category.name, category.slug, category.description, category.sort],
      );
    }
    const settings = [
      ["site_name", preset.siteName],
      ["site_tagline", preset.tagline],
      ["accent", preset.accent],
      ["preset", preset.id],
    ] as const;
    for (const [key, value] of settings) {
      await client.query(
        `insert into public.site_settings (key, value) values ($1, $2::jsonb)
         on conflict (key) do update set value = excluded.value`,
        [key, JSON.stringify(value)],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  return preset.id;
}

/**
 * Email clients cannot resolve the app's CSS custom properties. These values
 * are the generated, email-safe projection of the semantic @theme tokens.
 * Keep the names semantic so templates never invent a second palette.
 */
import { getPreset, parsePresetId } from "@/lib/config/presets";

export function getEmailTheme(presetId?: string) {
  const preset = getPreset(parsePresetId(presetId));
  return {
    background: "#ffffff",
    panel: "#f5f7f9",
    border: "#e2e5e9",
    text: "#35383d",
    muted: "#747980",
    accent: preset.emailAccent,
    accentText: preset.emailAccentText,
  } as const;
}

export const EMAIL_THEME = getEmailTheme(process.env.NEXT_PUBLIC_PRESET);

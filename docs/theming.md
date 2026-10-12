# Theming

Change the accent and the whole product follows — only tokens carry color (§5.3 of the build plan).

- **Tokens**: `src/styles/globals.css` — one `@theme` block, dark mode redefines tokens only under `.dark`.
- **Presets**: `src/styles/presets/*.css` — Remote (blue), AI (violet), Local (green), Community (amber). `NEXT_PUBLIC_PRESET` selects the build-time default; the `preset` settings row wins at runtime.
- **Rebranding**: set `site_name`, `site_tagline`, and `accent` through the admin settings. Email and Open Graph surfaces use the same preset contract.
- **Design contract**: `/kitchen-sink` renders every component in both themes; visual regression guards it.

To add a preset, extend `PRESET_IDS` and `PRESETS` in `src/lib/config/presets.ts`, add one token-only CSS file, import it from `src/styles/globals.css`, and add a unit test covering the new id and categories. Do not add component-local colors or one-off spacing values.

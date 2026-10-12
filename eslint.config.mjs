import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    rules: {
      // §0.2 forbidden patterns — the rest are enforced by scripts/check-forbidden.ts in CI.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/auth-helpers-nextjs",
              message: "Use @supabase/ssr — auth-helpers is a §0.2 forbidden pattern.",
            },
            {
              name: "@supabase/auth-helpers-react",
              message: "Use @supabase/ssr — auth-helpers is a §0.2 forbidden pattern.",
            },
          ],
          patterns: [
            {
              group: ["@supabase/auth-helpers*"],
              message: "Use @supabase/ssr — auth-helpers is a §0.2 forbidden pattern.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    ".netlify/**",
    "playwright-report/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

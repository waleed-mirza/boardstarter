import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
    },
  },
  test: {
    // Integration has no specs until the data layer lands (Week 2–3).
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.spec.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          // Server actions + data layer against the configured Supabase project.
          include: ["tests/integration/**/*.spec.ts"],
          environment: "node",
          // These specs share a cloud fixture and seeded auth accounts. Keep
          // files serial so one test cannot observe another test's temporary
          // job or invalidate a shared account session mid-request.
          fileParallelism: false,
          // Cloud-backed auth/data calls can exceed Vitest's 5-second default.
          testTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      // Line coverage measures logic, not vendor-copied UI primitives — those
      // are guarded by the e2e/axe/visual layers. §4.1 floors apply to lib/.
      include: ["src/lib/**", "src/hooks/**"],
      thresholds: {
        "src/lib/payments/**": { lines: 95 },
        "src/lib/validation/**": { lines: 95 },
        "src/lib/data/**": { lines: 90 },
        "src/lib/seo/**": { lines: 90 },
        "src/lib/auth/**": { lines: 90 },
        "src/lib/**": { lines: 70 },
        "src/hooks/**": { lines: 70 },
      },
    },
  },
});

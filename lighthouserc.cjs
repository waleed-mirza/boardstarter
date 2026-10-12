module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm build && pnpm start",
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 180000,
      url: [
        "http://localhost:3000/jobs",
        "http://localhost:3000/jobs/senior-typescript-engineer",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findClientBundleLeaks } from "../../scripts/verify-security";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createBuild(files: Record<string, string>): Promise<string> {
  const buildDirectory = await mkdtemp(join(tmpdir(), "boardstarter-security-"));
  temporaryDirectories.push(buildDirectory);

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = join(buildDirectory, "static", relativePath);
    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, contents, "utf8");
  }

  return buildDirectory;
}

describe("findClientBundleLeaks", () => {
  it("accepts a clean client bundle", async () => {
    const buildDirectory = await createBuild({ "chunks/app.js": "console.log('public');" });

    expect(findClientBundleLeaks(buildDirectory)).toEqual([]);
  });

  it("detects secret-key environment names", async () => {
    const buildDirectory = await createBuild({
      "chunks/app.js": "const name = 'SUPABASE_SECRET_KEY';",
    });

    expect(findClientBundleLeaks(buildDirectory)).toEqual([
      { file: join(buildDirectory, "static", "chunks/app.js"), marker: "SUPABASE_SECRET_KEY" },
    ]);
  });

  it("detects Supabase secret-key values", async () => {
    const buildDirectory = await createBuild({
      "chunks/app.js": "const key = 'sb_secret_test-value';",
    });

    expect(findClientBundleLeaks(buildDirectory)).toEqual([
      { file: join(buildDirectory, "static", "chunks/app.js"), marker: "sb_secret_test-value" },
    ]);
  });

  it("ignores the bare Supabase secret-key prefix used by the SDK", async () => {
    const buildDirectory = await createBuild({
      "chunks/vendor.js": "const prefix = 'sb_secret_';",
    });

    expect(findClientBundleLeaks(buildDirectory)).toEqual([]);
  });

  it("detects payment secret environment names and values", async () => {
    const names = await createBuild({
      "chunks/app.js": "const names = ['LEMONSQUEEZY_API_KEY', 'LEMONSQUEEZY_WEBHOOK_SECRET'];",
    });
    expect(findClientBundleLeaks(names).map(({ marker }) => marker)).toEqual(
      expect.arrayContaining(["LEMONSQUEEZY_API_KEY"]),
    );

    const values = await createBuild({
      "chunks/app.js": "const keys = ['lsk_live_test-value', 'whsec_test-value'];",
    });
    expect(findClientBundleLeaks(values).map(({ marker }) => marker)).toEqual(
      expect.arrayContaining(["lsk_live_test-value"]),
    );
  });

  it("detects email, cron, and indexing secret names", async () => {
    const buildDirectory = await createBuild({
      "chunks/email.js": "const name = 'RESEND_API_KEY';",
      "chunks/cron.js": "const name = 'CRON_SECRET';",
      "chunks/alerts.js": "const name = 'ALERT_TOKEN_SECRET';",
      "chunks/google.js": "const name = 'GOOGLE_INDEXING_SA_JSON';",
    });

    expect(findClientBundleLeaks(buildDirectory).map(({ marker }) => marker)).toEqual(
      expect.arrayContaining([
        "RESEND_API_KEY",
        "CRON_SECRET",
        "ALERT_TOKEN_SECRET",
        "GOOGLE_INDEXING_SA_JSON",
      ]),
    );
  });
});

import { config } from "dotenv";

import { ensureAdmin } from "./lib/admin";
import { setupDatabaseClient } from "./lib/db";
import { applyMigrations, applySeed } from "./lib/migrations";
import { applyPresetDefaults } from "./lib/preset";
import { parseEnv } from "../src/lib/config/env";

async function runSetup(): Promise<void> {
  config({ path: ".env.local", quiet: true });
  config({ path: ".env", quiet: true });
  const parsedEnv = parseEnv({ ...process.env } as Record<string, string | undefined>);
  if (!parsedEnv.ok) {
    throw new Error(parsedEnv.fieldErrors.map(({ field, message }) => `${field}: ${message}`).join("; "));
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!url || !secretKey || !adminEmail) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, and ADMIN_EMAIL are required. Copy .env.example to .env.local and fill them in. Run this script with `pnpm run setup` because pnpm reserves `pnpm setup` for its own installer.",
    );
  }

  const client = setupDatabaseClient();
  await client.connect();
  let presetId: string;
  try {
    await applyMigrations(client);
    await applySeed(client);
    presetId = await applyPresetDefaults(client, process.env.NEXT_PUBLIC_PRESET);
  } finally {
    await client.end();
  }
  const admin = await ensureAdmin({ url, secretKey, email: adminEmail });
  console.log(`✓ Database ready (preset: ${presetId}).`);
  console.log(`✓ Admin ready: ${admin.email}${admin.created ? " (created and confirmed)" : " (promoted)"}.`);
  console.log("Next steps: pnpm dev, then visit / and /admin.");
}

runSetup().catch((error) => {
  console.error(`✗ setup failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

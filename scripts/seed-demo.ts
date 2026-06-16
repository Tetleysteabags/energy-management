/**
 * Seed the signed-up Supabase user with realistic synthetic history.
 *
 * Prerequisites:
 *   1. Migrations applied in Supabase SQL editor
 *   2. .env.local with URL + service role key
 *   3. Account created via /signup (set SEED_USER_EMAIL to that address)
 *
 * Usage: npm run seed:demo
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { realistic } from "../lib/analysis/synthetic-data-generator";
import {
  datasetToDbRows,
  shiftDatasetToEndYesterday,
} from "../lib/demo/synthetic-to-db";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function upsertBatches(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  batchSize = 100,
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(chunk as never[], { onConflict });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.SEED_USER_EMAIL;

  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  if (!email) {
    throw new Error("Set SEED_USER_EMAIL in .env.local to your signed-up account");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userId = await findUserIdByEmail(supabase, email);
  if (!userId) {
    throw new Error(
      `No user found for ${email}. Sign up at http://localhost:3000/signup first.`,
    );
  }

  const days = Number.parseInt(process.env.SEED_DAYS ?? "180", 10);
  const seed = Number.parseInt(process.env.SEED_RANDOM ?? "7", 10);

  let dataset = realistic(days, seed);
  dataset = shiftDatasetToEndYesterday(dataset);

  const { dailyLogs, wearables } = datasetToDbRows(dataset, userId, {
    skipToday: true,
  });

  console.log(`Seeding ${email} (${userId})`);
  console.log(`  daily_logs: ${dailyLogs.length} rows`);
  console.log(`  wearables:  ${wearables.length} rows`);
  console.log(
    `  date range: ${dailyLogs[0]?.log_date} → ${dailyLogs.at(-1)?.log_date}`,
  );

  await upsertBatches(supabase, "daily_logs", dailyLogs, "user_id,log_date");
  await upsertBatches(
    supabase,
    "wearable_daily_metrics",
    wearables,
    "user_id,log_date,source",
  );

  console.log("\nDone. Start the app with npm run dev and sign in.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

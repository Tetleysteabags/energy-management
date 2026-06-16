/**
 * Apply supabase/migrations/*.sql in filename order.
 * Requires DATABASE_URL in .env.local (Supabase → Database → Connection string).
 *
 * Usage: npm run db:migrate
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

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

async function main(): Promise<void> {
  loadEnvLocal();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "Add DATABASE_URL to .env.local (Supabase → Project Settings → Database → URI).",
    );
  }

  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql") && !name.includes("ui_spec"))
    .sort();

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    for (const file of files) {
      const body = readFileSync(resolve(migrationsDir, file), "utf8");
      console.log(`Applying ${file}...`);
      await sql.unsafe(body);
      console.log(`  done`);
    }
    console.log("\nMigrations applied.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

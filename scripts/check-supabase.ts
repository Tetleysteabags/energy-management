import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: logsError } = await supabase.from("daily_logs").select("id").limit(1);
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 5,
  });

  if (logsError) {
    const needs =
      logsError.message.includes("does not exist") || logsError.code === "PGRST205";
    console.log("SCHEMA:", needs ? "migrations_needed" : logsError.message);
  } else {
    console.log("SCHEMA: ok");
  }

  if (usersError) {
    console.log("AUTH:", usersError.message);
  } else {
    console.log("USERS:", users.users.length ? users.users.map((u) => u.email).join(", ") : "none");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

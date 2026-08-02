/**
 * Crash-log redaction — run with: npm run test:scrub
 *
 * These assertions are the reason it is safe to store error text at all. If one
 * of them fails, health data or a credential can reach the diagnostics table.
 */

import {
  describeError,
  MAX_MESSAGE_LENGTH,
  scrub,
  scrubRoute,
} from "./scrub";

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}  ${detail}`);
  }
}

function redacts(name: string, input: string, mustNotContain: string): void {
  const output = scrub(input);
  check(name, !output.includes(mustNotContain), `leaked "${mustNotContain}" in: ${output}`);
}

console.log("\n[scrub] credentials never reach the log");
{
  redacts(
    "Supabase anon/service keys",
    "failed with key eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSJ9.abcdef",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  );
  redacts("bearer headers", "Authorization: Bearer sk-abc123def456ghi", "sk-abc123def456ghi");
  redacts("google client secrets", "secret GOCSPX-aBcDeF1234567 rejected", "GOCSPX-aBcDeF1234567");
  redacts(
    "google refresh tokens",
    "refresh 1//04aBcDeFgHiJkLmNoPqRsTuVwXyZ0123 expired",
    "1//04aBcDeFgHiJkLmNoPqRsTuVwXyZ0123",
  );
  redacts(
    "our own wearable token envelope",
    "bad payload v1:aBcDeF:gHiJkL:mNoPqRsTuVwXyZ",
    "v1:aBcDeF:gHiJkL:mNoPqRsTuVwXyZ",
  );
}

console.log("\n[scrub] personal details never reach the log");
{
  redacts("email addresses", "no user for alice.smith+test@example.com", "alice.smith+test@example.com");
  redacts("long digit runs", "contact 447700900123 failed", "447700900123");

  // Short numbers are the useful kind — row counts, status codes, scores.
  check("keeps short numbers", scrub("upsert of 42 rows failed with 500").includes("42"));
  check("keeps status codes", scrub("upsert of 42 rows failed with 500").includes("500"));
}

console.log("\n[scrub] length is bounded to the column constraint");
{
  const long = scrub("x".repeat(MAX_MESSAGE_LENGTH + 500));
  check("truncates to the limit", long.length <= MAX_MESSAGE_LENGTH, `got ${long.length}`);
  check("marks the truncation", long.endsWith("…"));
  check("leaves short messages alone", scrub("short") === "short");
}

console.log("\n[scrub] routes keep the path and drop the query");
{
  check("drops query strings", scrubRoute("/check-in/evening?date=2026-06-01") === "/check-in/evening");
  check("handles absolute urls", scrubRoute("https://example.com/settings?x=1") === "/settings");
  check("passes bare paths through", scrubRoute("/trends") === "/trends");
  check("handles null", scrubRoute(null) === null);
  check("handles empty", scrubRoute("") === null);
}

console.log("\n[scrub] describeError");
{
  const withStack = describeError(new Error("boom"));
  check("keeps the message", withStack.includes("boom"));
  check("prefers a stack", withStack.includes("Error"));
  check("handles thrown strings", describeError("plain failure") === "plain failure");
  check("handles thrown objects", describeError({ code: "23505" }).includes("23505"));
  check("handles null", describeError(null) === "null");

  // A Postgres error quoting a user's note must not survive as readable text.
  const pgError = new Error(
    'duplicate key violates constraint, detail: notes = "felt awful, emailed dr@clinic.example"',
  );
  check(
    "scrubbing applies to a wrapped database error",
    !scrub(describeError(pgError)).includes("dr@clinic.example"),
  );
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);

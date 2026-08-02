/**
 * Log date utilities — run with: npm run test:dates
 */

import {
  addDaysToLogDate,
  formatLogDateLabel,
  hourInTimeZone,
  isoDateInTimeZone,
  isToday,
  isValidTimeZone,
  MAX_LOG_DATE_LOOKBACK_DAYS,
  middayIsoForLogDate,
  parseLogDateParam,
  resolveTimeZone,
  todayLogDate,
  yesterdayLogDate,
} from "./log-date";

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

function eq(name: string, actual: unknown, expected: unknown): void {
  check(name, actual === expected, `expected ${String(expected)}, got ${String(actual)}`);
}

console.log("\n[log-date] calendar day follows the user's zone, not the server's");
{
  // The regression this module exists to prevent: an evening check-in filed at
  // 6:30pm in Los Angeles must not land on the next day's row.
  const laEvening = new Date("2026-08-01T18:30:00-07:00");
  eq("LA evening stays on its own day", isoDateInTimeZone(laEvening, "America/Los_Angeles"), "2026-08-01");
  eq("same instant is already tomorrow in UTC", isoDateInTimeZone(laEvening, "UTC"), "2026-08-02");

  // And the mirror image: after midnight in Nicosia is a new day there.
  const nicosiaLateNight = new Date("2026-08-02T01:30:00+03:00");
  eq("Nicosia past midnight rolls over", isoDateInTimeZone(nicosiaLateNight, "Asia/Nicosia"), "2026-08-02");
  eq("same instant is still yesterday in UTC", isoDateInTimeZone(nicosiaLateNight, "UTC"), "2026-08-01");

  // Zones far east of UTC roll over well before UTC does.
  const aucklandMorning = new Date("2026-08-02T09:00:00+12:00");
  eq("Auckland morning", isoDateInTimeZone(aucklandMorning, "Pacific/Auckland"), "2026-08-02");
  eq("Auckland morning is UTC yesterday", isoDateInTimeZone(aucklandMorning, "UTC"), "2026-08-01");
}

console.log("\n[log-date] timezone resolution");
{
  check("accepts a real zone", isValidTimeZone("America/New_York"));
  check("rejects nonsense", !isValidTimeZone("Mars/Olympus_Mons"));
  check("rejects null", !isValidTimeZone(null));
  eq("unknown zones fall back to UTC", resolveTimeZone("Mars/Olympus_Mons"), "UTC");
  eq("null falls back to UTC", resolveTimeZone(null), "UTC");
  eq("valid zones pass through", resolveTimeZone("Europe/London"), "Europe/London");
}

console.log("\n[log-date] hourInTimeZone");
{
  const instant = new Date("2026-08-01T18:30:00-07:00");
  eq("LA hour", hourInTimeZone(instant, "America/Los_Angeles"), 18);
  eq("UTC hour", hourInTimeZone(instant, "UTC"), 1);
  // Midnight must read as 0, not 24 — some engines format it as "24" under hour12: false.
  eq("midnight reads as zero", hourInTimeZone(new Date("2026-08-01T00:00:00Z"), "UTC"), 0);
}

console.log("\n[log-date] addDaysToLogDate / yesterdayLogDate");
{
  eq("steps back one day", yesterdayLogDate("2025-06-10"), "2025-06-09");
  eq("crosses a month boundary", yesterdayLogDate("2025-07-01"), "2025-06-30");
  eq("crosses a year boundary", yesterdayLogDate("2025-01-01"), "2024-12-31");
  eq("handles leap day", yesterdayLogDate("2024-03-01"), "2024-02-29");
  eq("adds days forward", addDaysToLogDate("2025-12-31", 1), "2026-01-01");
  eq("adds across 90 days", addDaysToLogDate("2026-01-01", -90), "2025-10-03");
  // Day arithmetic must not drift when a DST change falls inside the range.
  eq("spans a DST change", addDaysToLogDate("2026-03-28", 2), "2026-03-30");
}

console.log("\n[log-date] parseLogDateParam");
{
  const tz = "America/Los_Angeles";
  const today = todayLogDate(tz);

  eq("defaults empty to today", parseLogDateParam(undefined, tz), today);
  eq("defaults invalid to today", parseLogDateParam("not-a-date", tz), today);
  eq("rejects future dates", parseLogDateParam("2099-12-31", tz), today);
  eq("rejects impossible dates", parseLogDateParam("2025-02-30", tz), today);
  eq("rejects month 13", parseLogDateParam("2025-13-01", tz), today);

  const withinWindow = addDaysToLogDate(today, -7);
  eq("accepts valid past date", parseLogDateParam(withinWindow, tz), withinWindow);

  const edge = addDaysToLogDate(today, -MAX_LOG_DATE_LOOKBACK_DAYS);
  eq("accepts the oldest allowed date", parseLogDateParam(edge, tz), edge);

  const tooOld = addDaysToLogDate(today, -(MAX_LOG_DATE_LOOKBACK_DAYS + 1));
  eq("rejects dates beyond lookback", parseLogDateParam(tooOld, tz), today);
}

console.log("\n[log-date] middayIsoForLogDate");
{
  // Back-dated events are stamped at noon *local*, so they sort inside the day
  // the user picked rather than spilling into a neighbouring one.
  const la = middayIsoForLogDate("2026-08-01", "America/Los_Angeles");
  eq("noon in LA is 19:00Z in summer", la, "2026-08-01T19:00:00.000Z");
  eq("and reads back as the same day", isoDateInTimeZone(new Date(la), "America/Los_Angeles"), "2026-08-01");

  const auckland = middayIsoForLogDate("2026-08-01", "Pacific/Auckland");
  eq("noon in Auckland reads back correctly", isoDateInTimeZone(new Date(auckland), "Pacific/Auckland"), "2026-08-01");

  const utc = middayIsoForLogDate("2026-08-01", "UTC");
  eq("noon in UTC", utc, "2026-08-01T12:00:00.000Z");

  // Winter, so the offset differs from the summer case above.
  const laWinter = middayIsoForLogDate("2026-01-15", "America/Los_Angeles");
  eq("noon in LA is 20:00Z in winter", laWinter, "2026-01-15T20:00:00.000Z");
}

console.log("\n[log-date] isToday / labels");
{
  const tz = "Pacific/Auckland";
  check("isToday matches todayLogDate", isToday(todayLogDate(tz), tz));
  check("isToday rejects yesterday", !isToday(yesterdayLogDate(undefined, tz), tz));
  // The label must name the date it was given, whatever zone the renderer is in.
  check(
    "formatLogDateLabel names the given date",
    formatLogDateLabel("2025-06-17").includes("17"),
    formatLogDateLabel("2025-06-17"),
  );
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);

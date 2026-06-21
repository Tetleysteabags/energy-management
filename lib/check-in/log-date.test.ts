/**
 * Log date utilities — run with: tsx lib/check-in/log-date.test.ts
 */

import {
  formatLogDateLabel,
  isToday,
  MAX_LOG_DATE_LOOKBACK_DAYS,
  parseLogDateParam,
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

console.log("\n[log-date] parseLogDateParam");
{
  check("defaults empty to today", parseLogDateParam(undefined) === todayLogDate());
  check("defaults invalid to today", parseLogDateParam("not-a-date") === todayLogDate());
  check("rejects future dates", parseLogDateParam("2099-12-31") === todayLogDate());

  const withinWindow = new Date(`${todayLogDate()}T12:00:00`);
  withinWindow.setDate(withinWindow.getDate() - 7);
  const withinIso = withinWindow.toISOString().slice(0, 10);
  check("accepts valid past date", parseLogDateParam(withinIso) === withinIso);

  const tooOld = new Date(`${todayLogDate()}T12:00:00`);
  tooOld.setDate(tooOld.getDate() - (MAX_LOG_DATE_LOOKBACK_DAYS + 1));
  const tooOldIso = tooOld.toISOString().slice(0, 10);
  check(
    "rejects dates beyond lookback",
    parseLogDateParam(tooOldIso) === todayLogDate(),
    `got ${parseLogDateParam(tooOldIso)}`,
  );
}

console.log("\n[log-date] helpers");
{
  check("yesterday steps back one day", yesterdayLogDate("2025-06-10") === "2025-06-09");
  check("isToday matches todayLogDate", isToday(todayLogDate()));
  check("isToday rejects yesterday", !isToday(yesterdayLogDate()));
  check(
    "formatLogDateLabel includes weekday",
    formatLogDateLabel("2025-06-17").includes("Jun") ||
      formatLogDateLabel("2025-06-17").includes("17"),
  );
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);

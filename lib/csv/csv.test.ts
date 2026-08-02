/**
 * CSV round-trip — run with: npm run test:csv
 */

import { escapeCsvField, toCsv } from "./format";
import { csvRowsToDailyLogs, MAX_IMPORT_ROWS, parseCsv } from "./import";

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
  check(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

console.log("\n[csv] escaping");
{
  eq("plain text is quoted", escapeCsvField("hello"), '"hello"');
  eq("null becomes an empty cell", escapeCsvField(null), '""');
  eq("undefined becomes an empty cell", escapeCsvField(undefined), '""');
  eq("commas stay inside one cell", escapeCsvField("a,b"), '"a,b"');
  eq("quotes are doubled", escapeCsvField('Felt "wired but tired"'), '"Felt ""wired but tired"""');
  eq("newlines survive", escapeCsvField("Rough day.\nSlept badly."), '"Rough day.\nSlept badly."');
  eq("numbers render", escapeCsvField(7), '"7"');
  eq("zero is not treated as empty", escapeCsvField(0), '"0"');
  eq("false renders", escapeCsvField(false), '"false"');
}

console.log("\n[csv] formula injection is defused");
{
  // A note is a note. Excel must not evaluate it.
  eq("equals is escaped", escapeCsvField("=HYPERLINK(\"http://x\")"), '"\'=HYPERLINK(""http://x"")"');
  eq("plus is escaped", escapeCsvField("+1234"), "\"'+1234\"");
  eq("at is escaped", escapeCsvField("@SUM(A1)"), "\"'@SUM(A1)\"");
  eq("minus is escaped", escapeCsvField("-5+3"), "\"'-5+3\"");
  eq("tab lead is escaped", escapeCsvField("\tvalue"), '"\'\tvalue"');
  check("a mid-string equals is left alone", escapeCsvField("a=b") === '"a=b"');
}

console.log("\n[csv] document shape");
{
  const csv = toCsv(["a", "b"], [{ a: 1, b: "x" }], { bom: false });
  eq("header then row, CRLF separated", csv, '"a","b"\r\n"1","x"\r\n');

  const missing = toCsv(["a", "b"], [{ a: 1 }], { bom: false });
  eq("a missing key yields an empty cell", missing, '"a","b"\r\n"1",""\r\n');

  check("BOM is present by default", toCsv(["a"], []).startsWith("﻿"));
}

console.log("\n[csv] the export survives a round trip through the parser");
{
  // The regression that motivated this: a multi-line note used to split the row
  // and misalign every column after it.
  const note = 'Rough day.\nSlept badly, "wired but tired", and =tired';
  const csv = toCsv(["log_date", "capacity", "notes"], [
    { log_date: "2026-06-01", capacity: 5, notes: note },
  ]);

  const { headers, rows } = parseCsv(csv);
  eq("headers survive", headers.join(","), "log_date,capacity,notes");
  eq("one row, not two", rows.length, 1);
  eq("date survives", rows[0].log_date, "2026-06-01");
  eq("capacity is not shifted into another column", rows[0].capacity, "5");
  // No guard here: the note contains "=" but does not start with it.
  eq("note survives intact", rows[0].notes, note);

  // A note that does start with "=" picks up the apostrophe guard, by design.
  const guarded = parseCsv(toCsv(["notes"], [{ notes: "=tired" }]));
  eq("a formula-leading note comes back guarded", guarded.rows[0].notes, "'=tired");
}

console.log("\n[csv] parser");
{
  const { rows } = parseCsv('date,notes\r\n2026-06-01,"a,b"\r\n');
  eq("quoted comma stays in one field", rows[0].notes, "a,b");

  const doubled = parseCsv('date,notes\n2026-06-01,"say ""hi"""\n');
  eq("doubled quotes unescape", doubled.rows[0].notes, 'say "hi"');

  const multiline = parseCsv('date,notes\n2026-06-01,"line one\nline two"\n2026-06-02,plain\n');
  eq("embedded newline does not split the row", multiline.rows.length, 2);
  eq("multi-line note is intact", multiline.rows[0].notes, "line one\nline two");
  eq("the following row still parses", multiline.rows[1].date, "2026-06-02");

  eq("blank lines are skipped", parseCsv("date,pem\n\n2026-06-01,2\n\n").rows.length, 1);
  eq("a header alone yields nothing", parseCsv("date,pem\n").rows.length, 0);
  eq("empty input yields nothing", parseCsv("").rows.length, 0);
  eq("BOM is stripped from the first header", parseCsv("﻿date,pem\n2026-06-01,2\n").rows[0].date, "2026-06-01");
  eq("headers are lowercased", parseCsv("DATE,PEM\n2026-06-01,2\n").rows[0].pem, "2");
  eq("a file with no trailing newline still parses", parseCsv("date,pem\n2026-06-01,2").rows.length, 1);
}

console.log("\n[csv] row validation");
{
  const ok = csvRowsToDailyLogs([{ date: "2026-06-01", capacity: "5", pem: "2" }]);
  eq("valid row imports", ok.payloads.length, 1);
  eq("no errors on a clean row", ok.errors.length, 0);
  eq("capacity carried through", ok.payloads[0].capacity, 5);

  const badDate = csvRowsToDailyLogs([{ date: "01/06/2026", capacity: "5" }]);
  eq("a non-ISO date is rejected", badDate.payloads.length, 0);
  check("and says so", badDate.errors[0].reason.includes("YYYY-MM-DD"), badDate.errors[0]?.reason);

  const impossible = csvRowsToDailyLogs([{ date: "2026-02-30", capacity: "5" }]);
  eq("30 February is rejected", impossible.payloads.length, 0);

  const outOfRange = csvRowsToDailyLogs([{ date: "2026-06-01", capacity: "15" }]);
  eq("out-of-range value is rejected", outOfRange.payloads.length, 0);
  check("names the column and range", outOfRange.errors[0].reason.includes("0–10"), outOfRange.errors[0]?.reason);

  const badLoad = csvRowsToDailyLogs([{ date: "2026-06-01", physical_load: "7" }]);
  eq("loads are bounded at 3", badLoad.payloads.length, 0);

  const notNumeric = csvRowsToDailyLogs([{ date: "2026-06-01", pem: "quite bad" }]);
  eq("non-numeric value is rejected", notNumeric.payloads.length, 0);

  const missingDate = csvRowsToDailyLogs([{ capacity: "5" }]);
  eq("a row with no date is rejected", missingDate.payloads.length, 0);

  const duplicate = csvRowsToDailyLogs([
    { date: "2026-06-01", capacity: "5" },
    { date: "2026-06-01", capacity: "6" },
  ]);
  eq("duplicate dates keep the first", duplicate.payloads.length, 1);
  eq("and flag the second", duplicate.errors.length, 1);

  // One bad line must not sink the file.
  const mixed = csvRowsToDailyLogs([
    { date: "2026-06-01", capacity: "5" },
    { date: "nope", capacity: "5" },
    { date: "2026-06-03", capacity: "6" },
  ]);
  eq("good rows still import", mixed.payloads.length, 2);
  eq("bad row is reported", mixed.errors.length, 1);
  eq("with its line number", mixed.errors[0].line, 3);

  const sleepHours = csvRowsToDailyLogs([{ date: "2026-06-01", sleep_hours: "7.25" }]);
  eq("sleep hours keep one decimal", sleepHours.payloads[0].sleep_hours, 7.3);

  const tooLong = csvRowsToDailyLogs([{ date: "2026-06-01", notes: "x".repeat(2001) }]);
  eq("an over-long note is rejected", tooLong.payloads.length, 0);
}

console.log("\n[csv] submitted-at stamps");
{
  const morningOnly = csvRowsToDailyLogs([{ date: "2026-06-01", sleep_quality: "6" }]);
  check("morning stamped", morningOnly.payloads[0].morning_submitted_at != null);
  check("evening not fabricated", morningOnly.payloads[0].evening_submitted_at == null);

  const eveningOnly = csvRowsToDailyLogs([{ date: "2026-06-01", capacity: "5" }]);
  check("evening stamped", eveningOnly.payloads[0].evening_submitted_at != null);
  check("morning not fabricated", eveningOnly.payloads[0].morning_submitted_at == null);
}

console.log("\n[csv] upload bounds");
{
  const many = Array.from({ length: MAX_IMPORT_ROWS + 10 }, (_, i) => ({
    date: `2020-01-01`,
    capacity: "5",
    // Distinct dates so they are not rejected as duplicates.
    log_date: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
  }));
  const result = csvRowsToDailyLogs(many);
  check("stops at the row cap", result.payloads.length <= MAX_IMPORT_ROWS);
  eq("reports what it dropped", result.truncated, 10);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);

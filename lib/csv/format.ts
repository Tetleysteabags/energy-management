/**
 * RFC 4180 CSV writing.
 *
 * The previous approach only quoted fields containing a comma, which broke on
 * the one field users actually type into: a note with a line break split the
 * row in two and misaligned every column after it, in a file meant to be handed
 * to a clinician. Quoting unconditionally is simpler and always correct.
 */

/** Excel and Sheets treat a leading one of these as the start of a formula. */
const FORMULA_LEAD = new Set(["=", "+", "-", "@", "\t", "\r"]);

/** Byte order mark, so Excel reads the file as UTF-8 rather than guessing. */
const BOM = "﻿";

const CRLF = "\r\n";

export function escapeCsvField(value: unknown): string {
  if (value == null) return '""';

  let text = String(value);

  // A note starting "=" is a note, not a formula. Prefixing with an apostrophe
  // is the conventional way to tell a spreadsheet to treat it as text.
  if (text.length > 0 && FORMULA_LEAD.has(text[0])) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(escapeCsvField).join(",");
}

/**
 * Renders rows as a CSV document. `headers` doubles as the column order and the
 * key list, so a row missing a key simply yields an empty cell.
 */
export function toCsv(
  headers: string[],
  rows: Record<string, unknown>[],
  options: { bom?: boolean } = {},
): string {
  const lines = [csvRow(headers), ...rows.map((row) => csvRow(headers.map((key) => row[key])))];
  return (options.bom === false ? "" : BOM) + lines.join(CRLF) + CRLF;
}

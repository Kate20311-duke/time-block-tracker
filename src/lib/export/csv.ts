import {
  EXPORT_COLUMNS,
  exportRowToValues,
  type TimeBlockExportRow,
} from "@/lib/export/time-block-rows";

/** UTF-8 BOM so Excel opens UTF-8 CSV correctly on Windows. */
export const CSV_UTF8_BOM = "\uFEFF";

export type { TimeBlockExportRow, TimeBlockCsvRow } from "@/lib/export/time-block-rows";
export { formatExportDateTime } from "@/lib/export/time-block-rows";

/** Escape a single CSV cell (RFC 4180-style). */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Convert TimeBlock rows to a CSV string (includes UTF-8 BOM). */
export function timeBlocksToCsv(
  rows: TimeBlockExportRow[],
  timeZone: string,
): string {
  const lines = [
    EXPORT_COLUMNS.join(","),
    ...rows.map((row) =>
      exportRowToValues(row, timeZone).map(escapeCsvCell).join(","),
    ),
  ];
  return CSV_UTF8_BOM + lines.join("\r\n") + "\r\n";
}

/** @deprecated Use `EXPORT_COLUMNS` from `time-block-rows.ts` */
export const CSV_COLUMNS = EXPORT_COLUMNS;

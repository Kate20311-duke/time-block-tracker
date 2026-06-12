export type TimeBlockExportFormat = "csv" | "xlsx";

export function buildTimeBlocksExportFilename(
  fromParam: string,
  toParam: string,
  format: TimeBlockExportFormat,
): string {
  return `time-blocks-${fromParam}-to-${toParam}.${format}`;
}

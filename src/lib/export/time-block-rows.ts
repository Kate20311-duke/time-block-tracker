import { durationMinutes } from "@/lib/time";

export const EXPORT_COLUMNS = [
  "Title",
  "Category",
  "Category Color",
  "Start Time",
  "End Time",
  "Duration Minutes",
  "Status",
  "Completion Level",
  "Efficiency Level",
  "Source",
  "Note",
  "Created At",
  "Updated At",
] as const;

export type TimeBlockExportRow = {
  title: string;
  categoryName: string;
  categoryColor: string;
  startTime: Date;
  endTime: Date;
  status: string;
  completionLevel: number;
  efficiencyLevel: string | null;
  source: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** @deprecated Use `TimeBlockExportRow` */
export type TimeBlockCsvRow = TimeBlockExportRow;

type BlockWithCategory = {
  title: string;
  startTime: Date;
  endTime: Date;
  status: string;
  completionLevel: number;
  efficiencyLevel: string | null;
  source: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string; color: string };
};

export function mapBlocksToExportRows(
  blocks: BlockWithCategory[],
): TimeBlockExportRow[] {
  return blocks.map((block) => ({
    title: block.title,
    categoryName: block.category.name,
    categoryColor: block.category.color,
    startTime: block.startTime,
    endTime: block.endTime,
    status: block.status,
    completionLevel: block.completionLevel,
    efficiencyLevel: block.efficiencyLevel,
    source: block.source,
    note: block.note,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  }));
}

/** Format a UTC instant as `YYYY-MM-DD HH:mm:ss` in the given IANA timezone. */
export function formatExportDateTime(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Flatten an export row into column values (strings and numbers). */
export function exportRowToValues(
  row: TimeBlockExportRow,
  timeZone: string,
): (string | number)[] {
  return [
    row.title,
    row.categoryName,
    row.categoryColor,
    formatExportDateTime(row.startTime, timeZone),
    formatExportDateTime(row.endTime, timeZone),
    durationMinutes(row.startTime, row.endTime),
    row.status,
    row.completionLevel,
    row.efficiencyLevel ?? "",
    row.source,
    row.note ?? "",
    formatExportDateTime(row.createdAt, timeZone),
    formatExportDateTime(row.updatedAt, timeZone),
  ];
}

import type { ParsedIcsEvent } from "@/lib/import/ics-types";

export const ICS_APPLY_MAX_EVENTS = 200;

export const ICS_IMPORT_TITLE_MAX_LENGTH = 100;

export type IcsApplySkipReason =
  | "not_supported"
  | "all_day"
  | "invalid_dates"
  | "invalid_range"
  | "invalid_title"
  | "duplicate_exact"
  | "batch_duplicate"
  | "conflict"
  | "batch_limit";

export type IcsApplyInputEvent = Pick<
  ParsedIcsEvent,
  | "id"
  | "summary"
  | "description"
  | "location"
  | "start"
  | "end"
  | "isAllDay"
  | "status"
>;

export type IcsApplySkippedItem = {
  id?: string;
  summary: string;
  reason: IcsApplySkipReason;
};

export type IcsApplyResult = {
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  batchDuplicateCount: number;
  conflictSkippedCount: number;
  conflictImportedCount: number;
  invalidCount: number;
  unsupportedCount: number;
  createdTimeBlockIds: string[];
  skipped: IcsApplySkippedItem[];
};

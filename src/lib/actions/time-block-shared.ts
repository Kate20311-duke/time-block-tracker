import {
  formatCalendarDateParam,
  parseCalendarDateParam,
  parseCalendarViewParam,
} from "@/lib/calendar";
import { parseDateTimeLocal } from "@/lib/time";
import {
  clampCompletionLevel,
  getValidTimeBlockRange,
  validateTimeBlockCreate,
  type TimeBlockCreateError,
} from "@/lib/validation";

export type TimeBlockFormFields = {
  id: string;
  title: string;
  note: string | null;
  reviewNote: string | null;
  categoryId: string;
  status: string;
  completionLevel: number;
  efficiencyLevel: string | null;
  startTime: Date | null;
  endTime: Date | null;
};

export type ScheduleUpdateError =
  | "missing_fields"
  | "invalid_range"
  | "update_failed";

export type UpdateTimeBlockScheduleInput = {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
};

function parseOptionalNote(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

/** Parse TimeBlock fields from a form submission. */
export function parseTimeBlockFormData(formData: FormData): TimeBlockFormFields {
  const completionLevelRaw = formData.get("completionLevel");
  return {
    id: String(formData.get("id") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    note: parseOptionalNote(formData.get("note")),
    reviewNote: parseOptionalNote(formData.get("reviewNote")),
    categoryId: String(formData.get("categoryId") ?? "").trim(),
    status: String(formData.get("status") ?? "planned"),
    completionLevel:
      completionLevelRaw === null || completionLevelRaw === ""
        ? 0
        : Number(completionLevelRaw),
    efficiencyLevel: parseOptionalNote(formData.get("efficiencyLevel")),
    startTime: parseDateTimeLocal(String(formData.get("startTime") ?? "")),
    endTime: parseDateTimeLocal(String(formData.get("endTime") ?? "")),
  };
}

/** Validate full TimeBlock form fields and return a normalized time range. */
export function validateFullTimeBlockForm(data: TimeBlockFormFields): {
  error: TimeBlockCreateError | null;
  range: { start: Date; end: Date } | null;
} {
  const validationError = validateTimeBlockCreate({
    title: data.title,
    categoryId: data.categoryId,
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status,
    completionLevel: data.completionLevel,
    efficiencyLevel: data.efficiencyLevel,
  });

  if (validationError) {
    return { error: validationError, range: null };
  }

  const range = getValidTimeBlockRange(data.startTime, data.endTime);
  if (!range) {
    return { error: "invalid_range", range: null };
  }

  return { error: null, range };
}

/** Prisma update payload for a full TimeBlock edit. */
export function buildFullTimeBlockUpdateData(
  data: TimeBlockFormFields,
  range: { start: Date; end: Date },
) {
  return {
    title: data.title,
    note: data.note,
    reviewNote: data.reviewNote,
    categoryId: data.categoryId,
    status: data.status,
    completionLevel: clampCompletionLevel(data.completionLevel),
    efficiencyLevel: data.efficiencyLevel,
    startTime: range.start,
    endTime: range.end,
  };
}

/** Parse schedule-only input (drag/resize from calendar client). */
export function parseScheduleInput(
  input: UpdateTimeBlockScheduleInput,
): { id: string; startTime: Date; endTime: Date } {
  const start =
    input.startTime instanceof Date
      ? input.startTime
      : new Date(input.startTime);
  const end =
    input.endTime instanceof Date ? input.endTime : new Date(input.endTime);

  return {
    id: String(input.id ?? "").trim(),
    startTime: start,
    endTime: end,
  };
}

/** Validate schedule times (start < end only). */
export function validateScheduleTimes(
  startTime: Date,
  endTime: Date,
): ScheduleUpdateError | null {
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return "missing_fields";
  }
  if (!getValidTimeBlockRange(startTime, endTime)) {
    return "invalid_range";
  }
  return null;
}

/**
 * Build /calendar redirect URL from optional hidden form fields:
 * calendarDate, calendarView, calendarBlockId.
 */
export function buildCalendarRedirectPath(
  formData: FormData,
  options?: { success?: string; error?: string },
): string {
  const dateRaw = String(formData.get("calendarDate") ?? "").trim();
  const viewRaw = String(formData.get("calendarView") ?? "").trim();
  const blockId = String(formData.get("calendarBlockId") ?? "").trim();

  const params = new URLSearchParams();

  if (dateRaw) {
    params.set("date", formatCalendarDateParam(parseCalendarDateParam(dateRaw)));
  }

  if (parseCalendarViewParam(viewRaw || undefined) === "day") {
    params.set("view", "day");
  }

  if (blockId) {
    params.set("blockId", blockId);
  }

  if (options?.success) {
    params.set("success", options.success);
  }

  if (options?.error) {
    params.set("error", options.error);
  }

  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

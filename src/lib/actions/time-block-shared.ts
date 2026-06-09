import {
  formatCalendarDateParam,
  parseCalendarDateParam,
  parseCalendarViewParam,
} from "@/lib/calendar";
import { getCalendarTimeZone } from "@/lib/calendar-timezone";
import { parseUtcIsoString } from "@/lib/datetime-local-iso";
import {
  getValidTimeBlockRange,
  resolveCompletionLevelForWrite,
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
  /** null when omitted from form (preserve DB value on update). */
  completionLevel: number | null;
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

/**
 * Parse schedule times from form data.
 * Requires `startTimeIso` / `endTimeIso` (UTC from the browser). Ignores bare
 * `startTime` / `endTime` datetime-local fields (UI only).
 */
export function parseTimeBlockScheduleFromForm(formData: FormData): {
  startTime: Date | null;
  endTime: Date | null;
} {
  const startIso = String(formData.get("startTimeIso") ?? "").trim();
  const endIso = String(formData.get("endTimeIso") ?? "").trim();

  if (!startIso || !endIso) {
    return { startTime: null, endTime: null };
  }

  const start = parseUtcIsoString(startIso);
  const end = parseUtcIsoString(endIso);
  if (!start || !end) {
    return { startTime: null, endTime: null };
  }

  return { startTime: start, endTime: end };
}

/** Parse TimeBlock fields from a form submission. */
export function parseTimeBlockFormData(formData: FormData): TimeBlockFormFields {
  const completionLevelRaw = formData.get("completionLevel");
  const { startTime, endTime } = parseTimeBlockScheduleFromForm(formData);

  return {
    id: String(formData.get("id") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    note: parseOptionalNote(formData.get("note")),
    reviewNote: parseOptionalNote(formData.get("reviewNote")),
    categoryId: String(formData.get("categoryId") ?? "").trim(),
    status: String(formData.get("status") ?? "planned"),
    completionLevel:
      completionLevelRaw === null || completionLevelRaw === ""
        ? null
        : Number(completionLevelRaw),
    efficiencyLevel: parseOptionalNote(formData.get("efficiencyLevel")),
    startTime,
    endTime,
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
    completionLevel: resolveCompletionLevelForWrite(
      data.status,
      data.completionLevel,
    ),
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
  const payload = {
    title: data.title,
    note: data.note,
    reviewNote: data.reviewNote,
    categoryId: data.categoryId,
    status: data.status,
    efficiencyLevel: data.efficiencyLevel,
    startTime: range.start,
    endTime: range.end,
  };

  if (data.completionLevel !== null) {
    return {
      ...payload,
      completionLevel: resolveCompletionLevelForWrite(
        data.status,
        data.completionLevel,
      ),
    };
  }

  return payload;
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
const CALENDAR_DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

export function buildCalendarRedirectPath(
  formData: FormData,
  options?: { success?: string; error?: string },
  timeZone: string = getCalendarTimeZone(),
): string {
  const dateRaw = String(formData.get("calendarDate") ?? "").trim();
  const viewRaw = String(formData.get("calendarView") ?? "").trim();
  const blockId = String(formData.get("calendarBlockId") ?? "").trim();

  const params = new URLSearchParams();

  if (dateRaw) {
    if (CALENDAR_DATE_PARAM.test(dateRaw)) {
      params.set("date", dateRaw);
    } else {
      params.set(
        "date",
        formatCalendarDateParam(parseCalendarDateParam(dateRaw, timeZone), timeZone),
      );
    }
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

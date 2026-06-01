import type { Locale } from "@/lib/i18n/types";
import {
  addCalendarDateParam,
  formatCalendarDateParamInTimeZone,
  getCalendarTimeZone,
  getCalendarWeekday,
  getDayBoundsForDateParam,
  zonedEndOfCalendarDay,
  zonedStartOfCalendarDay,
} from "@/lib/calendar-timezone";

export { getCalendarTimeZone } from "@/lib/calendar-timezone";

/** Minutes in a calendar day (00:00–24:00). */
export const MINUTES_PER_DAY = 24 * 60;

/** Snap interval for drag/resize (minutes). */
export const CALENDAR_SNAP_MINUTES = 5;

/** Minimum allowed TimeBlock duration after move/resize (minutes). */
export const MIN_TIME_BLOCK_DURATION_MINUTES = 5;

/** Day grid layout (must match calendar-day-column). */
export const HOUR_ROW_PX = 48;
export const HOURS_PER_DAY = 24;
export const CALENDAR_GRID_HEIGHT_PX = HOURS_PER_DAY * HOUR_ROW_PX;

/** @deprecated Use CALENDAR_GRID_HEIGHT_PX */
export const GRID_HEIGHT_PX = CALENDAR_GRID_HEIGHT_PX;

export const DAYS_PER_WEEK = 7;

export type CalendarView = "day" | "week";

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Midnight at the start of the calendar day containing `date` (app timezone). */
export function startOfDay(date: Date): Date {
  const tz = getCalendarTimeZone();
  return zonedStartOfCalendarDay(formatCalendarDateParamInTimeZone(date, tz), tz);
}

/** Exclusive end of that calendar day (app timezone). */
export function endOfDay(date: Date): Date {
  const tz = getCalendarTimeZone();
  return zonedEndOfCalendarDay(formatCalendarDateParamInTimeZone(date, tz), tz);
}

/** Parse `YYYY-MM-DD` from URL; invalid or missing values fall back to today. */
export function parseCalendarDateParam(param: string | undefined): Date {
  const tz = getCalendarTimeZone();
  if (!param || !DATE_PARAM_PATTERN.test(param)) {
    return zonedStartOfCalendarDay(
      formatCalendarDateParamInTimeZone(new Date(), tz),
      tz,
    );
  }

  if (formatCalendarDateParamInTimeZone(zonedStartOfCalendarDay(param, tz), tz) !== param) {
    return zonedStartOfCalendarDay(
      formatCalendarDateParamInTimeZone(new Date(), tz),
      tz,
    );
  }

  return zonedStartOfCalendarDay(param, tz);
}

/** Format a date as `YYYY-MM-DD` for calendar navigation links (app timezone). */
export function formatCalendarDateParam(date: Date): string {
  return formatCalendarDateParamInTimeZone(date, getCalendarTimeZone());
}

/** Add days to a calendar day (result is start-of-day in app timezone). */
export function addCalendarDays(date: Date, days: number): Date {
  const tz = getCalendarTimeZone();
  const param = formatCalendarDateParamInTimeZone(date, tz);
  return zonedStartOfCalendarDay(addCalendarDateParam(param, days), tz);
}

/** Parse `?view=`; missing or invalid values default to `week`. */
export function parseCalendarViewParam(param: string | undefined): CalendarView {
  if (param === "day") return "day";
  return "week";
}

/** Monday 00:00 (app timezone) for the week containing `date`. */
export function startOfWeekMonday(date: Date): Date {
  const tz = getCalendarTimeZone();
  const anchorParam = formatCalendarDateParamInTimeZone(date, tz);
  const daysFromMonday = (getCalendarWeekday(anchorParam, tz) + 6) % 7;
  return zonedStartOfCalendarDay(
    addCalendarDateParam(anchorParam, -daysFromMonday),
    tz,
  );
}

/** Exclusive end of the Monday-based week (next Monday 00:00). */
export function endOfWeekMonday(date: Date): Date {
  return addCalendarDays(startOfWeekMonday(date), DAYS_PER_WEEK);
}

/** Monday through Sunday (7 days) for the week starting at `weekStart`. */
export function getWeekDays(weekStart: Date): Date[] {
  const start = startOfWeekMonday(weekStart);
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) =>
    addCalendarDays(start, i),
  );
}

/** Move anchor date by whole weeks (Monday-based). */
export function addCalendarWeeks(date: Date, weeks: number): Date {
  return addCalendarDays(startOfWeekMonday(date), weeks * DAYS_PER_WEEK);
}

/** Prisma query bounds: blocks overlapping the Monday week of `anchorDay`. */
export function getWeekQueryRange(anchorDay: Date): {
  weekStart: Date;
  weekEnd: Date;
} {
  const weekStart = startOfWeekMonday(anchorDay);
  return {
    weekStart,
    weekEnd: endOfWeekMonday(anchorDay),
  };
}

export type TimeRange = {
  startTime: Date;
  endTime: Date;
};

export type TimeRangeResult =
  | { ok: true; startTime: Date; endTime: Date }
  | { ok: false };

/** Round minutes to the nearest snap interval, then clamp to the day. */
export function snapMinutes(
  minutes: number,
  snap: number = CALENDAR_SNAP_MINUTES,
): number {
  if (snap <= 0) {
    return clampMinutesToDay(minutes);
  }
  return clampMinutesToDay(Math.round(minutes / snap) * snap);
}

/** Clamp minutes to [0, MINUTES_PER_DAY]. */
export function clampMinutesToDay(minutes: number): number {
  return Math.min(MINUTES_PER_DAY, Math.max(0, minutes));
}

/** Convert Y offset inside the day column to minutes from 00:00. */
export function pixelYToMinutes(
  y: number,
  containerHeightPx: number = CALENDAR_GRID_HEIGHT_PX,
): number {
  const height = containerHeightPx > 0 ? containerHeightPx : CALENDAR_GRID_HEIGHT_PX;
  const clampedY = Math.min(height, Math.max(0, y));
  return (clampedY / height) * MINUTES_PER_DAY;
}

/** Minutes from 00:00 to pixel offset from the top of the day grid. */
export function minutesToPixelY(
  minutes: number,
  containerHeightPx: number = CALENDAR_GRID_HEIGHT_PX,
): number {
  const height = containerHeightPx > 0 ? containerHeightPx : CALENDAR_GRID_HEIGHT_PX;
  return (clampMinutesToDay(minutes) / MINUTES_PER_DAY) * height;
}

/**
 * Snap a drag position (grid Y in px) to a valid top offset for a visible segment.
 * Preserves visible-segment duration and clamps to the calendar day.
 */
export function calculateSnappedDragTopPx(
  blockTopPxInGrid: number,
  segmentStart: Date,
  segmentEnd: Date,
  selectedDay: Date,
  containerHeightPx: number = CALENDAR_GRID_HEIGHT_PX,
): number | null {
  const targetStartMinutes = snapMinutes(
    pixelYToMinutes(blockTopPxInGrid, containerHeightPx),
  );
  const moved = calculateMovedRange(
    segmentStart,
    segmentEnd,
    targetStartMinutes,
    selectedDay,
  );
  if (!moved.ok) {
    return null;
  }
  const startMinutes = dateToMinutesFromDayStart(moved.startTime, selectedDay);
  return minutesToPixelY(startMinutes, containerHeightPx);
}

/** Minutes from 00:00 to CSS top %. */
export function minutesToTopPercent(minutes: number): number {
  return (clampMinutesToDay(minutes) / MINUTES_PER_DAY) * 100;
}

/** Duration in minutes to CSS height %. */
export function minutesToHeightPercent(durationMinutes: number): number {
  return (Math.max(0, durationMinutes) / MINUTES_PER_DAY) * 100;
}

/** Local minutes since midnight on `selectedDay`. */
export function dateToMinutesFromDayStart(date: Date, selectedDay: Date): number {
  const dayStart = startOfDay(selectedDay);
  return (date.getTime() - dayStart.getTime()) / 60_000;
}

/** Local Date on `selectedDay` at minutes from midnight. */
export function minutesFromDayStartToDate(
  minutes: number,
  selectedDay: Date,
): Date {
  const dayStart = startOfDay(selectedDay);
  return new Date(dayStart.getTime() + clampMinutesToDay(minutes) * 60_000);
}

/**
 * Move a block to a new start time on `selectedDay`, preserving duration.
 * Clamps so the full range stays within the day when possible.
 */
export function calculateMovedRange(
  originalStart: Date,
  originalEnd: Date,
  targetStartMinutes: number,
  selectedDay: Date,
  options?: {
    snap?: number;
    minDurationMinutes?: number;
  },
): TimeRangeResult {
  const durationMs = originalEnd.getTime() - originalStart.getTime();
  if (durationMs <= 0) {
    return { ok: false };
  }

  const durationMinutes = durationMs / 60_000;
  const snap = options?.snap ?? CALENDAR_SNAP_MINUTES;
  const minDuration =
    options?.minDurationMinutes ?? MIN_TIME_BLOCK_DURATION_MINUTES;

  if (durationMinutes < minDuration || durationMinutes > MINUTES_PER_DAY) {
    return { ok: false };
  }

  const dayStart = startOfDay(selectedDay);
  const dayEnd = endOfDay(selectedDay);

  let startMinutes = snapMinutes(targetStartMinutes, snap);
  const maxStartMinutes = MINUTES_PER_DAY - durationMinutes;
  if (startMinutes > maxStartMinutes) {
    startMinutes = snapMinutes(maxStartMinutes, snap);
  }

  let startTime = minutesFromDayStartToDate(startMinutes, selectedDay);
  let endTime = new Date(startTime.getTime() + durationMs);

  if (endTime > dayEnd) {
    const latestStartMs = dayEnd.getTime() - durationMs;
    if (latestStartMs < dayStart.getTime()) {
      return { ok: false };
    }
    startTime = new Date(latestStartMs);
    endTime = new Date(startTime.getTime() + durationMs);
  }

  if (endTime <= startTime) {
    return { ok: false };
  }

  const resultDuration = (endTime.getTime() - startTime.getTime()) / 60_000;
  if (resultDuration < minDuration) {
    return { ok: false };
  }

  return { ok: true, startTime, endTime };
}

/**
 * Resize by changing end time only; start time stays as `originalStart`.
 * `targetEndMinutes` is on `selectedDay` (local).
 */
export function calculateResizedRange(
  originalStart: Date,
  targetEndMinutes: number,
  selectedDay: Date,
  options?: {
    snap?: number;
    minDurationMinutes?: number;
  },
): TimeRangeResult {
  const snap = options?.snap ?? CALENDAR_SNAP_MINUTES;
  const minDuration =
    options?.minDurationMinutes ?? MIN_TIME_BLOCK_DURATION_MINUTES;

  const startTime = originalStart;
  const dayEnd = endOfDay(selectedDay);
  let endMinutes = snapMinutes(targetEndMinutes, snap);
  endMinutes = clampMinutesToDay(endMinutes);

  let endTime = minutesFromDayStartToDate(endMinutes, selectedDay);

  if (endTime <= startTime) {
    return { ok: false };
  }

  let durationMinutes =
    (endTime.getTime() - startTime.getTime()) / 60_000;

  if (durationMinutes < minDuration) {
    endTime = new Date(startTime.getTime() + minDuration * 60_000);
    if (endTime > dayEnd) {
      endTime = dayEnd;
    }
    durationMinutes =
      (endTime.getTime() - startTime.getTime()) / 60_000;
    if (endTime <= startTime || durationMinutes < minDuration) {
      return { ok: false };
    }
  }

  return { ok: true, startTime, endTime };
}

export type DayBlockLayout = {
  topPercent: number;
  heightPercent: number;
  visibleStart: Date;
  visibleEnd: Date;
};

/**
 * Position a time block within a single day column.
 * Cross-day blocks are clipped to the visible segment on `day`.
 */
export function layoutBlockInDay(
  block: TimeRange,
  day: Date,
): DayBlockLayout | null {
  const tz = getCalendarTimeZone();
  const dateParam = formatCalendarDateParamInTimeZone(day, tz);
  const { dayStart, dayEnd } = getDayBoundsForDateParam(dateParam, tz);

  if (block.endTime <= dayStart || block.startTime >= dayEnd) {
    return null;
  }

  const visibleStart =
    block.startTime < dayStart ? dayStart : block.startTime;
  const visibleEnd = block.endTime > dayEnd ? dayEnd : block.endTime;

  if (visibleEnd <= visibleStart) {
    return null;
  }

  const startMinutes = (visibleStart.getTime() - dayStart.getTime()) / 60_000;
  const durationMinutes =
    (visibleEnd.getTime() - visibleStart.getTime()) / 60_000;

  return {
    topPercent: (startMinutes / MINUTES_PER_DAY) * 100,
    heightPercent: (durationMinutes / MINUTES_PER_DAY) * 100,
    visibleStart,
    visibleEnd,
  };
}

/** Prisma query bounds: blocks that overlap the given calendar day. */
export function getDayQueryRange(day: Date): {
  dayStart: Date;
  dayEnd: Date;
} {
  return {
    dayStart: startOfDay(day),
    dayEnd: endOfDay(day),
  };
}

export function formatCalendarDayHeading(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: getCalendarTimeZone(),
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Short label for a week column header (e.g. Mon 5/19). */
export function formatCalendarColumnHeading(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: getCalendarTimeZone(),
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

/** Range label for the week containing `weekStart` (Mon–Sun). */
export function formatWeekRangeHeading(weekStart: Date, locale: Locale): string {
  const loc = locale === "zh" ? "zh-CN" : "en-US";
  const tz = getCalendarTimeZone();
  const sunday = addCalendarDays(startOfWeekMonday(weekStart), 6);
  const start = startOfWeekMonday(weekStart);
  const sameYear =
    formatCalendarDateParamInTimeZone(start, tz).slice(0, 4) ===
    formatCalendarDateParamInTimeZone(sunday, tz).slice(0, 4);

  const startFmt = new Intl.DateTimeFormat(loc, {
    timeZone: tz,
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endFmt = new Intl.DateTimeFormat(loc, {
    timeZone: tz,
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startFmt.format(start)} – ${endFmt.format(sunday)}`;
}

export function formatTimeOfDay(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Hour labels 0–23 for the day grid. */
export function getHourLabels(): number[] {
  return Array.from({ length: 24 }, (_, hour) => hour);
}

export function formatHourLabel(hour: number, locale: Locale): string {
  const date = new Date(2000, 0, 1, hour, 0);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "numeric",
  }).format(date);
}

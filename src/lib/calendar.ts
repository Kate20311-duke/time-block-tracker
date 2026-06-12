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

/** Midnight at the start of the calendar day containing `date` in `timeZone`. */
export function startOfDay(
  date: Date,
  timeZone: string = getCalendarTimeZone(),
): Date {
  return zonedStartOfCalendarDay(
    formatCalendarDateParamInTimeZone(date, timeZone),
    timeZone,
  );
}

/** Exclusive end of that calendar day in `timeZone`. */
export function endOfDay(
  date: Date,
  timeZone: string = getCalendarTimeZone(),
): Date {
  return zonedEndOfCalendarDay(
    formatCalendarDateParamInTimeZone(date, timeZone),
    timeZone,
  );
}

/**
 * Parse `YYYY-MM-DD` from URL as that civil date in `timeZone`.
 * Invalid or missing values fall back to today in `timeZone`.
 * Does not use `new Date("YYYY-MM-DD")` (UTC interpretation).
 */
export function parseCalendarDateParam(
  param: string | undefined,
  timeZone: string = getCalendarTimeZone(),
): Date {
  if (!param || !DATE_PARAM_PATTERN.test(param)) {
    return zonedStartOfCalendarDay(
      formatCalendarDateParamInTimeZone(new Date(), timeZone),
      timeZone,
    );
  }

  if (
    formatCalendarDateParamInTimeZone(
      zonedStartOfCalendarDay(param, timeZone),
      timeZone,
    ) !== param
  ) {
    return zonedStartOfCalendarDay(
      formatCalendarDateParamInTimeZone(new Date(), timeZone),
      timeZone,
    );
  }

  return zonedStartOfCalendarDay(param, timeZone);
}

/** Format a UTC instant as `YYYY-MM-DD` in `timeZone`. */
export function formatCalendarDateParam(
  date: Date,
  timeZone: string = getCalendarTimeZone(),
): string {
  return formatCalendarDateParamInTimeZone(date, timeZone);
}

/** Add days to a calendar day (result is start-of-day in `timeZone`). */
export function addCalendarDays(
  date: Date,
  days: number,
  timeZone: string = getCalendarTimeZone(),
): Date {
  const param = formatCalendarDateParamInTimeZone(date, timeZone);
  return zonedStartOfCalendarDay(addCalendarDateParam(param, days), timeZone);
}

/** Parse `?view=`; missing or invalid values default to `week`. */
export function parseCalendarViewParam(param: string | undefined): CalendarView {
  if (param === "day") return "day";
  return "week";
}

/** Monday 00:00 in `timeZone` for the week containing `date`. */
export function startOfWeekMonday(
  date: Date,
  timeZone: string = getCalendarTimeZone(),
): Date {
  const anchorParam = formatCalendarDateParamInTimeZone(date, timeZone);
  const daysFromMonday = (getCalendarWeekday(anchorParam, timeZone) + 6) % 7;
  return zonedStartOfCalendarDay(
    addCalendarDateParam(anchorParam, -daysFromMonday),
    timeZone,
  );
}

/** Exclusive end of the Monday-based week (next Monday 00:00) in `timeZone`. */
export function endOfWeekMonday(
  date: Date,
  timeZone: string = getCalendarTimeZone(),
): Date {
  return addCalendarDays(
    startOfWeekMonday(date, timeZone),
    DAYS_PER_WEEK,
    timeZone,
  );
}

/** Monday through Sunday (7 days) for the week containing `weekStart`. */
export function getWeekDays(
  weekStart: Date,
  timeZone: string = getCalendarTimeZone(),
): Date[] {
  const start = startOfWeekMonday(weekStart, timeZone);
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) =>
    addCalendarDays(start, i, timeZone),
  );
}

/** Move anchor date by whole weeks (Monday-based) in `timeZone`. */
export function addCalendarWeeks(
  date: Date,
  weeks: number,
  timeZone: string = getCalendarTimeZone(),
): Date {
  return addCalendarDays(
    startOfWeekMonday(date, timeZone),
    weeks * DAYS_PER_WEEK,
    timeZone,
  );
}

/** Prisma query bounds: blocks overlapping the Monday week of `anchorDay` in `timeZone`. */
export function getWeekQueryRange(
  anchorDay: Date,
  timeZone: string = getCalendarTimeZone(),
): {
  weekStart: Date;
  weekEnd: Date;
} {
  const weekStart = startOfWeekMonday(anchorDay, timeZone);
  return {
    weekStart,
    weekEnd: endOfWeekMonday(anchorDay, timeZone),
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
  timeZone: string = getCalendarTimeZone(),
): number | null {
  const targetStartMinutes = snapMinutes(
    pixelYToMinutes(blockTopPxInGrid, containerHeightPx),
  );
  const moved = calculateMovedRange(
    segmentStart,
    segmentEnd,
    targetStartMinutes,
    selectedDay,
    undefined,
    timeZone,
  );
  if (!moved.ok) {
    return null;
  }
  const startMinutes = dateToMinutesFromDayStart(
    moved.startTime,
    selectedDay,
    timeZone,
  );
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

/** Minutes since local midnight on `selectedDay` in `timeZone`. */
export function dateToMinutesFromDayStart(
  date: Date,
  selectedDay: Date,
  timeZone: string = getCalendarTimeZone(),
): number {
  const dayStart = startOfDay(selectedDay, timeZone);
  return (date.getTime() - dayStart.getTime()) / 60_000;
}

/** UTC instant at minutes from local midnight on `selectedDay` in `timeZone`. */
export function minutesFromDayStartToDate(
  minutes: number,
  selectedDay: Date,
  timeZone: string = getCalendarTimeZone(),
): Date {
  const dayStart = startOfDay(selectedDay, timeZone);
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
  timeZone: string = getCalendarTimeZone(),
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

  const dayStart = startOfDay(selectedDay, timeZone);
  const dayEnd = endOfDay(selectedDay, timeZone);

  let startMinutes = snapMinutes(targetStartMinutes, snap);
  const maxStartMinutes = MINUTES_PER_DAY - durationMinutes;
  if (startMinutes > maxStartMinutes) {
    startMinutes = snapMinutes(maxStartMinutes, snap);
  }

  let startTime = minutesFromDayStartToDate(startMinutes, selectedDay, timeZone);
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
  timeZone: string = getCalendarTimeZone(),
): TimeRangeResult {
  const snap = options?.snap ?? CALENDAR_SNAP_MINUTES;
  const minDuration =
    options?.minDurationMinutes ?? MIN_TIME_BLOCK_DURATION_MINUTES;

  const startTime = originalStart;
  const dayEnd = endOfDay(selectedDay, timeZone);
  let endMinutes = snapMinutes(targetEndMinutes, snap);
  endMinutes = clampMinutesToDay(endMinutes);

  let endTime = minutesFromDayStartToDate(endMinutes, selectedDay, timeZone);

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

export type VisibleSegment = {
  visibleStart: Date;
  visibleEnd: Date;
};

export type DayBlockLayout = VisibleSegment & {
  topPercent: number;
  heightPercent: number;
  durationMinutes: number;
  columnIndex: number;
  columnsInGroup: number;
  leftPercent: number;
  widthPercent: number;
};

/** Input for per-day overlap layout; `id` ties layout back to a TimeBlock. */
export type TimedBlockLayoutInput = TimeRange & {
  id: string;
  title?: string;
};

export type DayBlockLayoutWithId = DayBlockLayout & {
  id: string;
};

/** Drop layout-only `id` / sort `title` before passing to calendar UI components. */
export function toDayBlockLayout(layout: DayBlockLayoutWithId): DayBlockLayout {
  const { id, title, ...dayLayout } = layout as DayBlockLayoutWithId & {
    title?: string;
  };
  void id;
  void title;
  return dayLayout;
}

/** True when visible intervals overlap (touching endpoints do not overlap). */
export function visibleIntervalsOverlap(
  a: VisibleSegment,
  b: VisibleSegment,
): boolean {
  return (
    a.visibleStart.getTime() < b.visibleEnd.getTime() &&
    b.visibleStart.getTime() < a.visibleEnd.getTime()
  );
}

/** Visible segment of `block` on calendar day `day`, or null if no overlap. */
export function getVisibleSegmentInDay(
  block: TimeRange,
  day: Date,
  timeZone: string = getCalendarTimeZone(),
): VisibleSegment | null {
  const dateParam = formatCalendarDateParamInTimeZone(day, timeZone);
  const { dayStart, dayEnd } = getDayBoundsForDateParam(dateParam, timeZone);

  if (block.endTime <= dayStart || block.startTime >= dayEnd) {
    return null;
  }

  const visibleStart =
    block.startTime < dayStart ? dayStart : block.startTime;
  const visibleEnd = block.endTime > dayEnd ? dayEnd : block.endTime;

  if (visibleEnd <= visibleStart) {
    return null;
  }

  return { visibleStart, visibleEnd };
}

/**
 * Position a time block within a single day column (no overlap columns).
 * Prefer {@link layoutBlocksInDay} when rendering multiple blocks.
 */
export function layoutBlockInDay(
  block: TimeRange,
  day: Date,
  timeZone: string = getCalendarTimeZone(),
): DayBlockLayout | null {
  const layouts = layoutBlocksInDay(
    [{ ...block, id: "__single__" }],
    day,
    timeZone,
  );
  return layouts[0] ?? null;
}

function layoutBaseFromSegment(
  segment: VisibleSegment,
  day: Date,
  timeZone: string,
): Pick<
  DayBlockLayout,
  "topPercent" | "heightPercent" | "durationMinutes" | "visibleStart" | "visibleEnd"
> {
  const dateParam = formatCalendarDateParamInTimeZone(day, timeZone);
  const { dayStart } = getDayBoundsForDateParam(dateParam, timeZone);
  const startMinutes =
    (segment.visibleStart.getTime() - dayStart.getTime()) / 60_000;
  const durationMinutes =
    (segment.visibleEnd.getTime() - segment.visibleStart.getTime()) / 60_000;

  return {
    visibleStart: segment.visibleStart,
    visibleEnd: segment.visibleEnd,
    durationMinutes,
    topPercent: (startMinutes / MINUTES_PER_DAY) * 100,
    heightPercent: (durationMinutes / MINUTES_PER_DAY) * 100,
  };
}

type LayoutBaseWithId = Omit<
  DayBlockLayout,
  "columnIndex" | "columnsInGroup" | "leftPercent" | "widthPercent"
> & {
  id: string;
  title: string;
};

function compareLayoutInputs(a: LayoutBaseWithId, b: LayoutBaseWithId): number {
  return (
    a.visibleStart.getTime() - b.visibleStart.getTime() ||
    a.visibleEnd.getTime() - b.visibleEnd.getTime() ||
    (a.title ?? "").localeCompare(b.title ?? "") ||
    a.id.localeCompare(b.id)
  );
}

/** Assign side-by-side columns for overlapping visible segments. */
export function assignOverlapColumns(
  layouts: LayoutBaseWithId[],
): DayBlockLayoutWithId[] {
  if (layouts.length === 0) {
    return [];
  }

  const sorted = [...layouts].sort(compareLayoutInputs);

  const columnEnds: number[] = [];
  const withIndex = sorted.map((layout) => {
    let columnIndex = columnEnds.findIndex(
      (endMs) => endMs <= layout.visibleStart.getTime(),
    );
    if (columnIndex === -1) {
      columnIndex = columnEnds.length;
      columnEnds.push(0);
    }
    columnEnds[columnIndex] = layout.visibleEnd.getTime();
    return { layout, columnIndex };
  });

  return withIndex.map(({ layout, columnIndex }) => {
    const overlapping = withIndex.filter(({ layout: otherLayout }) =>
      visibleIntervalsOverlap(layout, otherLayout),
    );
    const columnsInGroup =
      Math.max(...overlapping.map(({ columnIndex: i }) => i + 1), 1);
    const widthPercent = 100 / columnsInGroup;
    const leftPercent = columnIndex * widthPercent;

    return {
      ...layout,
      columnIndex,
      columnsInGroup,
      leftPercent,
      widthPercent,
    };
  });
}

/**
 * Layout multiple blocks for one calendar day using visible segments and overlap columns.
 */
export function layoutBlocksInDay(
  blocks: TimedBlockLayoutInput[],
  day: Date,
  timeZone: string = getCalendarTimeZone(),
): DayBlockLayoutWithId[] {
  const baseLayouts = blocks
    .map((block) => {
      const segment = getVisibleSegmentInDay(block, day, timeZone);
      if (!segment) return null;
      return {
        id: block.id,
        title: block.title ?? "",
        ...layoutBaseFromSegment(segment, day, timeZone),
      } satisfies LayoutBaseWithId;
    })
    .filter((layout): layout is LayoutBaseWithId => layout !== null);

  return assignOverlapColumns(baseLayouts);
}

/** Time label: full original range; clipped segments add a continued marker. */
export function formatCalendarBlockTimeLabel(
  originalStart: Date,
  originalEnd: Date,
  visibleStart: Date,
  visibleEnd: Date,
  locale: Locale,
  continuedLabel: string,
  timeZone: string = getCalendarTimeZone(),
): string {
  const full = `${formatTimeOfDay(originalStart, locale, timeZone)} – ${formatTimeOfDay(originalEnd, locale, timeZone)}`;
  const sameAsVisible =
    visibleStart.getTime() === originalStart.getTime() &&
    visibleEnd.getTime() === originalEnd.getTime();
  if (sameAsVisible) {
    return full;
  }
  const visibleOnly = `${formatTimeOfDay(visibleStart, locale, timeZone)} – ${formatTimeOfDay(visibleEnd, locale, timeZone)}`;
  return `${visibleOnly} · ${continuedLabel}`;
}

/**
 * Prisma query bounds: blocks overlapping the calendar day in `timeZone`.
 * `day` may be a `Date` anchor or `YYYY-MM-DD` civil date string.
 */
export function getDayQueryRange(
  day: Date | string,
  timeZone: string = getCalendarTimeZone(),
): {
  dayStart: Date;
  dayEnd: Date;
} {
  const anchor =
    typeof day === "string" ? zonedStartOfCalendarDay(day, timeZone) : day;
  return {
    dayStart: startOfDay(anchor, timeZone),
    dayEnd: endOfDay(anchor, timeZone),
  };
}

export function formatCalendarDayHeading(
  date: Date,
  locale: Locale,
  timeZone: string = getCalendarTimeZone(),
): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Short label for a week column header (e.g. Mon 5/19). */
export function formatCalendarColumnHeading(
  date: Date,
  locale: Locale,
  timeZone: string = getCalendarTimeZone(),
): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone,
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

/** Range label for the week containing `weekStart` (Mon–Sun). */
export function formatWeekRangeHeading(
  weekStart: Date,
  locale: Locale,
  timeZone: string = getCalendarTimeZone(),
): string {
  const loc = locale === "zh" ? "zh-CN" : "en-US";
  const sunday = addCalendarDays(startOfWeekMonday(weekStart, timeZone), 6, timeZone);
  const start = startOfWeekMonday(weekStart, timeZone);
  const sameYear =
    formatCalendarDateParamInTimeZone(start, timeZone).slice(0, 4) ===
    formatCalendarDateParamInTimeZone(sunday, timeZone).slice(0, 4);

  const startFmt = new Intl.DateTimeFormat(loc, {
    timeZone,
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endFmt = new Intl.DateTimeFormat(loc, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startFmt.format(start)} – ${endFmt.format(sunday)}`;
}

export function formatTimeOfDay(
  date: Date,
  locale: Locale,
  timeZone: string = getCalendarTimeZone(),
): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
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

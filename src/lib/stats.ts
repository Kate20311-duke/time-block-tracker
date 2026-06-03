import {
  addCalendarDays,
  endOfDay,
  getCalendarTimeZone,
  startOfDay,
} from "@/lib/calendar";
import { formatCalendarDateParamInTimeZone } from "@/lib/calendar-timezone";
import type { Locale } from "@/lib/i18n/types";
import { formatDurationMinutes } from "@/lib/time";

export type TimeBlockLike = {
  startTime: Date;
  endTime: Date;
  categoryId: string | null;
  status: string | null;
  completionLevel?: number | null;
  efficiencyLevel?: string | null;
};

export type CategoryLike = {
  id: string;
  name: string;
  color: string;
};

export type CategoryTimeMinutes = {
  categoryId: string;
  categoryName: string | null;
  categoryColor: string | null;
  totalMinutes: number;
  blockCount: number;
};

export type CategoryTimeHours = Omit<CategoryTimeMinutes, "totalMinutes"> & {
  totalHours: number;
};

export type CompletionStatusCounts = {
  totalBlocks: number;
  byStatus: Record<string, number>;
};

export type CompletionStatusMinutes = {
  totalMinutes: number;
  byStatusMinutes: Record<string, number>;
};

export type CompletionQualityCategorySummary = {
  categoryId: string;
  plannedMinutes: number;
  completedMinutes: number;
  skippedMinutes: number;
  partialMinutes: number;
  completionRate: number; // 0..1
};

export type CompletionQualitySummary = {
  totalPlannedMinutes: number;
  totalCompletedMinutes: number;
  totalSkippedMinutes: number;
  totalPartialMinutes: number;
  completionRate: number; // completed/planned, 0..1
  skippedRate: number; // skipped/planned, 0..1
  averageCompletionLevel: number; // 0..100 (duration-weighted)
  highEfficiencyMinutes: number;
  lowEfficiencyMinutes: number;
  categoryBreakdown: CategoryTimeMinutes[];
  completionByCategory: CompletionQualityCategorySummary[];
};

export type DailyCompletionQuality = {
  dayStart: Date;
  summary: CompletionQualitySummary;
};

export type DailyTotal = {
  /** Local day start (00:00) for this bucket. */
  dayStart: Date;
  /** Total recorded minutes that overlap this day. */
  totalMinutes: number;
};

export const UNCATEGORIZED_ID = "__uncategorized__";
export const UNKNOWN_STATUS = "__unknown__";
export const UNKNOWN_EFFICIENCY = "__unknown_efficiency__";

function isValidDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/**
 * Safe duration in minutes between two timestamps.
 * - Invalid dates => 0
 * - end <= start => 0
 * - Never negative
 */
export function durationMinutesSafe(startTime: Date, endTime: Date): number {
  if (!isValidDate(startTime) || !isValidDate(endTime)) return 0;
  const ms = endTime.getTime() - startTime.getTime();
  if (ms <= 0) return 0;
  return Math.max(0, Math.round(ms / 60_000));
}

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function safeStatus(status: string | null | undefined): string {
  const raw = String(status ?? "").trim();
  return raw || UNKNOWN_STATUS;
}

function safeEfficiency(level: string | null | undefined): string {
  const raw = String(level ?? "").trim();
  return raw || UNKNOWN_EFFICIENCY;
}

function completedMinutesForBlock(block: TimeBlockLike, durationMinutes: number): number {
  const status = safeStatus(block.status);
  if (durationMinutes <= 0) return 0;

  if (status === "completed") return durationMinutes;
  if (status === "partial") {
    const pct = clampPercent(Number(block.completionLevel ?? 0));
    return Math.round((durationMinutes * pct) / 100);
  }
  // planned/skipped/unknown => 0 completed minutes
  return 0;
}

function skippedMinutesForBlock(block: TimeBlockLike, durationMinutes: number): number {
  const status = safeStatus(block.status);
  if (durationMinutes <= 0) return 0;
  return status === "skipped" ? durationMinutes : 0;
}

function partialMinutesForBlock(block: TimeBlockLike, durationMinutes: number): number {
  const status = safeStatus(block.status);
  if (durationMinutes <= 0) return 0;
  return status === "partial" ? durationMinutes : 0;
}

/**
 * Completion + review quality summary for a set of TimeBlocks.
 *
 * Rules:
 * - totalPlannedMinutes: sum of all block durations (safe, non-negative)
 * - completed:
 *   - status=completed => full duration
 *   - status=partial => duration * completionLevel%
 * - skipped: status=skipped => full duration
 * - partial: status=partial => full duration (separate bucket)
 * - completionRate = totalCompletedMinutes / totalPlannedMinutes
 * - skippedRate = totalSkippedMinutes / totalPlannedMinutes
 * - averageCompletionLevel: duration-weighted (completed=100, planned/skipped=0, partial=completionLevel)
 * - efficiency minutes:
 *   - efficiencyLevel=high => count full duration
 *   - efficiencyLevel=low  => count full duration
 *   - other/empty => ignored
 */
export function summarizeCompletionQuality(
  blocks: readonly TimeBlockLike[],
  categories: readonly CategoryLike[] = [],
): CompletionQualitySummary {
  const totalPlannedMinutes = totalRecordedMinutes(blocks);

  let totalCompletedMinutes = 0;
  let totalSkippedMinutes = 0;
  let totalPartialMinutes = 0;
  let highEfficiencyMinutes = 0;
  let lowEfficiencyMinutes = 0;

  let completionWeightedSum = 0;
  let completionWeightedMinutes = 0;

  for (const b of blocks) {
    const duration = durationMinutesSafe(b.startTime, b.endTime);
    if (duration <= 0) continue;

    totalCompletedMinutes += completedMinutesForBlock(b, duration);
    totalSkippedMinutes += skippedMinutesForBlock(b, duration);
    totalPartialMinutes += partialMinutesForBlock(b, duration);

    const status = safeStatus(b.status);
    const completionLevel =
      status === "completed"
        ? 100
        : status === "partial"
          ? clampPercent(Number(b.completionLevel ?? 0))
          : 0;

    completionWeightedSum += completionLevel * duration;
    completionWeightedMinutes += duration;

    const eff = safeEfficiency(b.efficiencyLevel);
    if (eff === "high") highEfficiencyMinutes += duration;
    if (eff === "low") lowEfficiencyMinutes += duration;
  }

  const completionRate =
    totalPlannedMinutes > 0 ? totalCompletedMinutes / totalPlannedMinutes : 0;
  const skippedRate =
    totalPlannedMinutes > 0 ? totalSkippedMinutes / totalPlannedMinutes : 0;
  const averageCompletionLevel =
    completionWeightedMinutes > 0
      ? Math.round((completionWeightedSum / completionWeightedMinutes) * 10) / 10
      : 0;

  const categoryBreakdown =
    categories.length > 0 ? totalMinutesByCategory(blocks, categories) : [];

  const grouped = groupTimeBlocksByCategory(blocks);
  const completionByCategory: CompletionQualityCategorySummary[] = Object.entries(
    grouped,
  ).map(([categoryId, list]) => {
    const plannedMinutes = totalRecordedMinutes(list);
    const completedMinutes = list.reduce((sum, b) => {
      const d = durationMinutesSafe(b.startTime, b.endTime);
      return sum + completedMinutesForBlock(b, d);
    }, 0);
    const skippedMinutes = list.reduce((sum, b) => {
      const d = durationMinutesSafe(b.startTime, b.endTime);
      return sum + skippedMinutesForBlock(b, d);
    }, 0);
    const partialMinutes = list.reduce((sum, b) => {
      const d = durationMinutesSafe(b.startTime, b.endTime);
      return sum + partialMinutesForBlock(b, d);
    }, 0);

    return {
      categoryId,
      plannedMinutes,
      completedMinutes,
      skippedMinutes,
      partialMinutes,
      completionRate: plannedMinutes > 0 ? completedMinutes / plannedMinutes : 0,
    };
  });

  completionByCategory.sort((a, b) => b.plannedMinutes - a.plannedMinutes);

  return {
    totalPlannedMinutes,
    totalCompletedMinutes,
    totalSkippedMinutes,
    totalPartialMinutes,
    completionRate,
    skippedRate,
    averageCompletionLevel,
    highEfficiencyMinutes,
    lowEfficiencyMinutes,
    categoryBreakdown,
    completionByCategory,
  };
}

/**
 * Daily completion quality summaries for a Monday-start week (Mon–Sun),
 * attributing each block to the day it starts (same convention as dashboard).
 */
export function dailyCompletionQualityForSelectedWeek(
  blocks: readonly TimeBlockLike[],
  weekStart: Date,
  categories: readonly CategoryLike[] = [],
  timeZone: string = getCalendarTimeZone(),
): DailyCompletionQuality[] {
  const start = startOfDay(weekStart, timeZone);
  const days = Array.from({ length: 7 }, (_, i) =>
    addCalendarDays(start, i, timeZone),
  );

  return days.map((dayStart) => {
    const dayEnd = endOfDay(dayStart, timeZone);
    const dayBlocks = blocks
      .map((b) => clipTimeBlockToWindow(b, dayStart, dayEnd))
      .filter((b): b is TimeBlockLike => b !== null);
    return { dayStart, summary: summarizeCompletionQuality(dayBlocks, categories) };
  });
}

/**
 * Minutes of overlap between [rangeStart, rangeEnd) and [windowStart, windowEnd).
 * All inputs must be Dates; invalid dates yield 0.
 */
export function overlapMinutes(
  rangeStart: Date,
  rangeEnd: Date,
  windowStart: Date,
  windowEnd: Date,
): number {
  if (
    !isValidDate(rangeStart) ||
    !isValidDate(rangeEnd) ||
    !isValidDate(windowStart) ||
    !isValidDate(windowEnd)
  ) {
    return 0;
  }
  const start = Math.max(rangeStart.getTime(), windowStart.getTime());
  const end = Math.min(rangeEnd.getTime(), windowEnd.getTime());
  if (end <= start) return 0;
  return Math.max(0, Math.round((end - start) / 60_000));
}

/** Total recorded minutes across all time blocks (safe, non-negative). */
export function totalRecordedMinutes(blocks: readonly TimeBlockLike[]): number {
  if (!blocks.length) return 0;
  return blocks.reduce(
    (sum, b) => sum + durationMinutesSafe(b.startTime, b.endTime),
    0,
  );
}

/** Minutes of a block that overlap [rangeStart, rangeEnd) — same basis as totals/charts. */
export function clippedDurationMinutesInRange(
  startTime: Date,
  endTime: Date,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  return overlapMinutes(startTime, endTime, rangeStart, rangeEnd);
}

/**
 * Human-readable duration for list rows in a day/week context.
 * Shows clipped contribution; adds full block total when different (e.g. cross-midnight).
 */
export function formatBlockDurationInRange(
  startTime: Date,
  endTime: Date,
  rangeStart: Date,
  rangeEnd: Date,
  locale: Locale,
  scope: "day" | "week" = "day",
): string {
  const clipped = clippedDurationMinutesInRange(
    startTime,
    endTime,
    rangeStart,
    rangeEnd,
  );
  const total = durationMinutesSafe(startTime, endTime);

  if (clipped === total) {
    return formatDurationMinutes(clipped, locale);
  }

  const clippedStr = formatDurationMinutes(clipped, locale);
  const totalStr = formatDurationMinutes(total, locale);
  if (locale === "zh") {
    const scopeLabel = scope === "day" ? "本日" : "本周";
    return `${clippedStr}（${scopeLabel}）· 共 ${totalStr}`;
  }
  const scopeLabel = scope === "day" ? "this day" : "this week";
  return `${clippedStr} (${scopeLabel}) · ${totalStr} total`;
}

/** Clip each block to a range; drops non-overlapping blocks. */
export function clipBlocksToRange<T extends TimeBlockLike>(
  blocks: readonly T[],
  rangeStart: Date,
  rangeEnd: Date,
): T[] {
  return blocks
    .map((block) => {
      const clipped = clipTimeBlockToWindow(block, rangeStart, rangeEnd);
      if (!clipped) return null;
      return { ...block, startTime: clipped.startTime, endTime: clipped.endTime };
    })
    .filter((block): block is T => block !== null);
}

/** Sum overlap minutes of each block with [rangeStart, rangeEnd). */
export function totalRecordedMinutesInRange(
  blocks: readonly TimeBlockLike[],
  rangeStart: Date,
  rangeEnd: Date,
): number {
  if (!blocks.length) return 0;
  return blocks.reduce(
    (sum, b) =>
      sum + overlapMinutes(b.startTime, b.endTime, rangeStart, rangeEnd),
    0,
  );
}

/** Clip block to [windowStart, windowEnd); null if no overlap. */
export function clipTimeBlockToWindow(
  block: TimeBlockLike,
  windowStart: Date,
  windowEnd: Date,
): TimeBlockLike | null {
  const startMs = Math.max(block.startTime.getTime(), windowStart.getTime());
  const endMs = Math.min(block.endTime.getTime(), windowEnd.getTime());
  if (endMs <= startMs) return null;
  return {
    ...block,
    startTime: new Date(startMs),
    endTime: new Date(endMs),
  };
}

/**
 * Group blocks by categoryId.
 * - Missing/empty categoryId is placed under UNCATEGORIZED_ID.
 */
export function groupTimeBlocksByCategory(
  blocks: readonly TimeBlockLike[],
): Record<string, TimeBlockLike[]> {
  const grouped: Record<string, TimeBlockLike[]> = {};
  for (const block of blocks) {
    const rawId = (block.categoryId ?? "").trim();
    const key = rawId ? rawId : UNCATEGORIZED_ID;
    (grouped[key] ??= []).push(block);
  }
  return grouped;
}

/**
 * Total minutes by categoryId, enriched with category display info when available.
 * - Unknown categories are included with null name/color.
 * - Uncategorized blocks use UNCATEGORIZED_ID.
 */
export function totalMinutesByCategory(
  blocks: readonly TimeBlockLike[],
  categories: readonly CategoryLike[],
): CategoryTimeMinutes[] {
  if (!blocks.length) return [];

  const categoryMap = new Map<string, CategoryLike>();
  for (const c of categories) categoryMap.set(c.id, c);

  const grouped = groupTimeBlocksByCategory(blocks);
  const rows: CategoryTimeMinutes[] = [];

  for (const [categoryId, list] of Object.entries(grouped)) {
    const minutes = list.reduce(
      (sum, b) => sum + durationMinutesSafe(b.startTime, b.endTime),
      0,
    );

    const category =
      categoryId === UNCATEGORIZED_ID ? null : (categoryMap.get(categoryId) ?? null);

    rows.push({
      categoryId,
      categoryName: category ? category.name : null,
      categoryColor: category ? category.color : null,
      totalMinutes: minutes,
      blockCount: list.length,
    });
  }

  // Stable ordering for UI: most minutes first, then name/id.
  rows.sort((a, b) => {
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
    const an = a.categoryName ?? "";
    const bn = b.categoryName ?? "";
    if (an !== bn) return an.localeCompare(bn);
    return a.categoryId.localeCompare(b.categoryId);
  });

  return rows;
}

/** Total hours by category (derived from minutes, rounded to 1 decimal). */
export function totalHoursByCategory(
  blocks: readonly TimeBlockLike[],
  categories: readonly CategoryLike[],
): CategoryTimeHours[] {
  return totalMinutesByCategory(blocks, categories).map((row) => ({
    ...row,
    totalHours: Math.round((row.totalMinutes / 60) * 10) / 10,
  }));
}

/**
 * Count blocks by completion status (string).
 * - Missing/empty status is counted under UNKNOWN_STATUS.
 */
export function completionStatusCounts(
  blocks: readonly Pick<TimeBlockLike, "status">[],
): CompletionStatusCounts {
  const byStatus: Record<string, number> = {};
  for (const b of blocks) {
    const raw = String(b.status ?? "").trim();
    const status = raw ? raw : UNKNOWN_STATUS;
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  return { totalBlocks: blocks.length, byStatus };
}

/**
 * Total recorded minutes by completion status (string).
 * Uses safe non-negative duration.
 */
export function completionStatusTotalMinutes(
  blocks: readonly TimeBlockLike[],
): CompletionStatusMinutes {
  const byStatusMinutes: Record<string, number> = {};
  let totalMinutes = 0;

  for (const b of blocks) {
    const minutes = durationMinutesSafe(b.startTime, b.endTime);
    totalMinutes += minutes;

    const raw = String(b.status ?? "").trim();
    const status = raw ? raw : UNKNOWN_STATUS;
    byStatusMinutes[status] = (byStatusMinutes[status] ?? 0) + minutes;
  }

  return { totalMinutes, byStatusMinutes };
}

/**
 * Daily totals (minutes) for a selected week (Mon–Sun buckets).
 * - `weekStart` should be a local day (commonly Monday 00:00), but we normalize it.
 * - Cross-day blocks are clipped per day via overlapMinutes.
 */
export function dailyTotalsForSelectedWeek(
  blocks: readonly TimeBlockLike[],
  weekStart: Date,
  timeZone: string = getCalendarTimeZone(),
): DailyTotal[] {
  const start = startOfDay(weekStart, timeZone);
  const days: DailyTotal[] = Array.from({ length: 7 }, (_, i) => ({
    dayStart: addCalendarDays(start, i, timeZone),
    totalMinutes: 0,
  }));

  if (!blocks.length) return days;

  for (let i = 0; i < days.length; i++) {
    const dayStart = days[i].dayStart;
    const dayEnd = endOfDay(dayStart, timeZone);

    let minutes = 0;
    for (const b of blocks) {
      minutes += overlapMinutes(b.startTime, b.endTime, dayStart, dayEnd);
    }
    days[i] = { dayStart, totalMinutes: minutes };
  }

  return days;
}

/**
 * Daily totals (minutes) for a selected week (Mon–Sun buckets),
 * attributing the FULL duration of each block to the day it starts.
 *
 * This is a simpler convention than overlap-based clipping and is useful
 * when you want "belongs to start day" semantics.
 */
/**
 * Daily totals attributing full block duration to local start day in `timeZone`.
 * Prefer {@link dailyTotalsForSelectedWeek} for cross-midnight overlap clipping.
 */
export function dailyStartTotalsForSelectedWeek(
  blocks: readonly TimeBlockLike[],
  weekStart: Date,
  timeZone: string = getCalendarTimeZone(),
): DailyTotal[] {
  const start = startOfDay(weekStart, timeZone);
  const days: DailyTotal[] = Array.from({ length: 7 }, (_, i) => ({
    dayStart: addCalendarDays(start, i, timeZone),
    totalMinutes: 0,
  }));

  if (!blocks.length) return days;

  const indexByDayParam = new Map<string, number>();
  for (let i = 0; i < days.length; i++) {
    indexByDayParam.set(
      formatCalendarDateParamInTimeZone(days[i].dayStart, timeZone),
      i,
    );
  }

  for (const b of blocks) {
    const startDayParam = formatCalendarDateParamInTimeZone(b.startTime, timeZone);
    const idx = indexByDayParam.get(startDayParam);
    if (idx === undefined) continue;
    days[idx] = {
      dayStart: days[idx].dayStart,
      totalMinutes: days[idx].totalMinutes + durationMinutesSafe(b.startTime, b.endTime),
    };
  }

  return days;
}


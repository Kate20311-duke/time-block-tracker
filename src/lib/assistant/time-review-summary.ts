import "server-only";

import { addCalendarDays, endOfDay, startOfDay } from "@/lib/calendar";
import { formatCalendarDateParamInTimeZone } from "@/lib/calendar-timezone";
import { computeDataQuality } from "@/lib/assistant/data-quality";
import {
  countInclusiveCalendarDays,
  resolveQueryRange,
  type ReviewRangeParams,
} from "@/lib/assistant/time-review-range";
import type {
  AssistantDailyTotal,
  TimeReviewSummary,
} from "@/lib/assistant/weekly-review-types";
import {
  categoriesForUser,
  focusSessionsForUser,
  timeBlocksForUser,
} from "@/lib/db/scoped";
import {
  focusStatsMinutesForSession,
  isFocusSessionCompleted,
} from "@/lib/focus-stats";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n";
import {
  clipTimeBlockToWindow,
  overlapMinutes,
  summarizeCompletionQuality,
  totalMinutesByCategory,
  totalRecordedMinutesInRange,
  type TimeBlockLike,
} from "@/lib/stats";

function dailyTotalsForRange(
  blocks: readonly TimeBlockLike[],
  rangeStart: Date,
  dayCount: number,
  timeZone: string,
  rangeEnd: Date,
): AssistantDailyTotal[] {
  const days: AssistantDailyTotal[] = Array.from({ length: dayCount }, (_, i) => {
    const dayStart = addCalendarDays(rangeStart, i, timeZone);
    return {
      date: formatCalendarDateParamInTimeZone(dayStart, timeZone),
      minutes: 0,
    };
  });

  if (!blocks.length) return days;

  for (let i = 0; i < days.length; i++) {
    const dayStart = addCalendarDays(rangeStart, i, timeZone);
    const dayEnd = endOfDay(dayStart, timeZone);
    const windowEnd = new Date(Math.min(dayEnd.getTime(), rangeEnd.getTime()));
    if (windowEnd.getTime() <= dayStart.getTime()) continue;

    let minutes = 0;
    for (const block of blocks) {
      minutes += overlapMinutes(
        block.startTime,
        block.endTime,
        dayStart,
        windowEnd,
      );
    }
    days[i] = { ...days[i], minutes };
  }

  return days;
}

export async function getTimeReviewSummary(params: {
  userId: string;
  timeZone: string;
  locale?: Locale;
  range: ReviewRangeParams;
  now?: Date;
}): Promise<TimeReviewSummary> {
  const {
    userId,
    timeZone,
    locale = "zh",
    range,
    now = new Date(),
  } = params;
  const t = getDictionary(locale);
  const { rangeStart, rangeEnd } = resolveQueryRange(
    range.startDate,
    range.endDate,
    timeZone,
    now,
  );
  const rangeDays = countInclusiveCalendarDays(
    range.startDate,
    range.endDate,
    timeZone,
  );

  const [categories, blocks, focusSessions] = await Promise.all([
    categoriesForUser(userId, { orderBy: { name: "asc" } }),
    timeBlocksForUser(userId, {
      where: {
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      orderBy: { startTime: "asc" },
    }),
    focusSessionsForUser(userId, {
      where: {
        startTime: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const blocksLite: TimeBlockLike[] = blocks.map((block) => ({
    startTime: block.startTime,
    endTime: block.endTime,
    categoryId: block.categoryId,
    status: block.status,
    completionLevel: block.completionLevel,
    efficiencyLevel: block.efficiencyLevel,
  }));

  const totalRecordedMinutes = totalRecordedMinutesInRange(
    blocksLite,
    rangeStart,
    rangeEnd,
  );

  const blocksInRange = blocksLite
    .map((block) => clipTimeBlockToWindow(block, rangeStart, rangeEnd))
    .filter((block): block is TimeBlockLike => block !== null);

  const categoryRows = totalMinutesByCategory(blocksInRange, categories);
  const breakdownTotal = categoryRows.reduce(
    (sum, row) => sum + row.totalMinutes,
    0,
  );

  const categoryBreakdown = categoryRows.map((row) => ({
    categoryId: row.categoryId,
    name: row.categoryName ?? t.assistant.uncategorized,
    minutes: row.totalMinutes,
    percentage:
      breakdownTotal > 0
        ? Math.round((row.totalMinutes / breakdownTotal) * 100)
        : 0,
  }));

  const activeCategories = categoryBreakdown
    .filter((row) => row.minutes > 0)
    .map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
    }));

  const periodStart = startOfDay(rangeStart, timeZone);
  const dailyTotals = dailyTotalsForRange(
    blocksLite,
    periodStart,
    rangeDays,
    timeZone,
    rangeEnd,
  );

  const recordedDays = dailyTotals.filter((day) => day.minutes > 0).length;

  const completionQuality =
    blocksInRange.length > 0
      ? summarizeCompletionQuality(blocksInRange, categories)
      : null;

  const focusSessionsLite = focusSessions.map((session) => ({
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    categoryId: session.categoryId,
    actualDurationMinutes: session.actualDurationMinutes,
    plannedDurationMinutes: session.plannedDurationMinutes,
    convertedToTimeBlock: session.convertedToTimeBlock,
  }));

  let focusTotalMinutes = 0;
  let focusCompletedCount = 0;
  for (const session of focusSessionsLite) {
    if (isFocusSessionCompleted(session.status)) {
      focusCompletedCount++;
      focusTotalMinutes += focusStatsMinutesForSession(session);
    }
  }

  const dataQuality = computeDataQuality(
    totalRecordedMinutes,
    recordedDays,
    rangeDays,
    locale,
  );

  return {
    range: {
      start: range.startDate,
      end: range.endDate,
    },
    totalRecordedMinutes,
    activeCategories,
    categoryBreakdown,
    dailyTotals,
    completionRate: completionQuality ? completionQuality.completionRate : null,
    focusSessions: {
      totalCount: focusSessionsLite.length,
      completedCount: focusCompletedCount,
      totalMinutes: focusTotalMinutes,
    },
    dataScopeNote: t.assistant.dataScopeNote,
    dataQuality,
  };
}

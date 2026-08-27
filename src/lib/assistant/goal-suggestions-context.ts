import "server-only";

import { addCalendarDays, startOfDay } from "@/lib/calendar";
import { formatCalendarDateParamInTimeZone } from "@/lib/calendar-timezone";
import {
  GOAL_SUGGESTIONS_CONTEXT_DAYS,
  type GoalSuggestionsCategoryRow,
  type GoalSuggestionsContext,
} from "@/lib/assistant/goal-suggestions-types";
import {
  categoriesForUser,
  focusSessionsForUser,
  goalsForUser,
  timeBlocksForUser,
} from "@/lib/db/scoped";
import {
  filterFocusSessionsByStartInRange,
  focusStatsMinutesForSession,
  isFocusSessionCompleted,
} from "@/lib/focus-stats";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n";
import {
  clipTimeBlockToWindow,
  totalMinutesByCategory,
  totalRecordedMinutesInRange,
  type TimeBlockLike,
} from "@/lib/stats";

export async function getGoalSuggestionsContext(params: {
  userId: string;
  timeZone: string;
  locale?: Locale;
  now?: Date;
}): Promise<GoalSuggestionsContext> {
  const { userId, timeZone, locale = "zh", now = new Date() } = params;
  const t = getDictionary(locale);

  const rangeEnd = now;
  const rangeStart = addCalendarDays(
    startOfDay(now, timeZone),
    -(GOAL_SUGGESTIONS_CONTEXT_DAYS - 1),
    timeZone,
  );

  const rangeStartParam = formatCalendarDateParamInTimeZone(rangeStart, timeZone);
  const rangeEndParam = formatCalendarDateParamInTimeZone(now, timeZone);

  const [categories, blocks, focusSessions, activeGoals] = await Promise.all([
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
        startTime: { gte: rangeStart, lt: rangeEnd },
      },
      orderBy: { startTime: "asc" },
    }),
    goalsForUser(userId, {
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        title: true,
        metric: true,
        period: true,
        targetMinutes: true,
        categoryId: true,
      },
    }),
  ]);

  const blockLite: TimeBlockLike[] = blocks.map((block) => ({
    startTime: block.startTime,
    endTime: block.endTime,
    categoryId: block.categoryId,
    status: block.status,
  }));

  const clippedBlocks = blockLite
    .map((block) => clipTimeBlockToWindow(block, rangeStart, rangeEnd))
    .filter((block): block is TimeBlockLike => block !== null);

  const categoryMinutes = totalMinutesByCategory(clippedBlocks, categories);
  const categoryRowMap = new Map<string, GoalSuggestionsCategoryRow>(
    categories.map((category) => [
      category.id,
      {
        categoryId: category.id,
        name: category.name,
        minutes: 0,
        completedBlocks: 0,
        focusMinutes: 0,
        focusSessions: 0,
      },
    ]),
  );

  for (const row of categoryMinutes) {
    const existing = categoryRowMap.get(row.categoryId);
    if (existing) existing.minutes = row.totalMinutes;
  }

  let completedBlocksCount = 0;
  for (const block of clippedBlocks) {
    if (String(block.status ?? "").trim() !== "completed") continue;
    completedBlocksCount++;
    const row = block.categoryId ? categoryRowMap.get(block.categoryId) : undefined;
    if (row) row.completedBlocks++;
  }

  const focusInRange = filterFocusSessionsByStartInRange(
    focusSessions.map((session) => ({
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      categoryId: session.categoryId,
      actualDurationMinutes: session.actualDurationMinutes,
      plannedDurationMinutes: session.plannedDurationMinutes,
      convertedToTimeBlock: session.convertedToTimeBlock,
    })),
    rangeStart,
    rangeEnd,
  );

  let focusTotalMinutes = 0;
  let focusCompletedCount = 0;
  for (const session of focusInRange) {
    if (!isFocusSessionCompleted(session.status)) continue;
    focusCompletedCount++;
    const minutes = focusStatsMinutesForSession(session);
    focusTotalMinutes += minutes;
    const row = session.categoryId
      ? categoryRowMap.get(session.categoryId)
      : undefined;
    if (row) {
      row.focusMinutes += minutes;
      row.focusSessions++;
    }
  }

  const totalRecordedMinutes = totalRecordedMinutesInRange(
    clippedBlocks,
    rangeStart,
    rangeEnd,
  );

  const categoryBreakdown = [...categoryRowMap.values()]
    .filter(
      (row) =>
        row.minutes > 0 ||
        row.completedBlocks > 0 ||
        row.focusMinutes > 0 ||
        row.focusSessions > 0,
    )
    .sort((a, b) => b.minutes + b.focusMinutes - (a.minutes + a.focusMinutes));

  const avgDailyMinutes = totalRecordedMinutes / GOAL_SUGGESTIONS_CONTEXT_DAYS;
  const avgDailyCompletedBlocks = completedBlocksCount / GOAL_SUGGESTIONS_CONTEXT_DAYS;
  const avgDailyFocusMinutes = focusTotalMinutes / GOAL_SUGGESTIONS_CONTEXT_DAYS;
  const avgDailyFocusSessions = focusCompletedCount / GOAL_SUGGESTIONS_CONTEXT_DAYS;

  return {
    timezone: timeZone,
    rangeStart: rangeStartParam,
    rangeEnd: rangeEndParam,
    rangeDays: GOAL_SUGGESTIONS_CONTEXT_DAYS,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    timeBlocks: {
      totalRecordedMinutes,
      completedBlocksCount,
      avgDailyMinutes: Math.round(avgDailyMinutes),
      avgDailyCompletedBlocks: Math.round(avgDailyCompletedBlocks * 10) / 10,
      categoryBreakdown,
    },
    focus: {
      totalMinutes: focusTotalMinutes,
      completedSessionCount: focusCompletedCount,
      avgDailyMinutes: Math.round(avgDailyFocusMinutes),
      avgDailySessions: Math.round(avgDailyFocusSessions * 10) / 10,
      categoryBreakdown: categoryBreakdown.filter(
        (row) => row.focusMinutes > 0 || row.focusSessions > 0,
      ),
    },
    activeGoals: activeGoals.map((goal) => ({
      title: goal.title,
      metric: goal.metric,
      period: goal.period,
      targetMinutes: goal.targetMinutes,
      categoryId: goal.categoryId,
    })),
    dataScopeNote: t.goals.aiSuggestions.dataScopeNote
      .replace("{days}", String(GOAL_SUGGESTIONS_CONTEXT_DAYS))
      .replace("{start}", rangeStartParam)
      .replace("{end}", rangeEndParam),
  };
}
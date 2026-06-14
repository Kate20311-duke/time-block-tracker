import { DashboardView } from "@/components/dashboard-view";
import type { DashboardGoalPreviewItem } from "@/components/dashboard-goals-preview";
import type { DashboardRunningSession } from "@/components/dashboard-active-timer";
import {
  categoriesForUser,
  focusSessionsForUser,
  activeFocusSessionForUser,
  timeBlocksForUser,
} from "@/lib/db/scoped";
import { ensureAndEvaluateGoalPeriodsForUser } from "@/lib/actions/goals";
import { getDashboardDateRanges } from "@/lib/dashboard-ranges";
import { getDictionary, formatMessage } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import {
  filterFocusSessionsByStartInRange,
  summarizeFocusSessions,
} from "@/lib/focus-stats";
import { requireUser } from "@/lib/session";
import { formatDurationMinutes } from "@/lib/time";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";
import {
  clipTimeBlockToWindow,
  completionStatusCounts,
  dailyTotalsForSelectedWeek,
  durationMinutesSafe,
  totalMinutesByCategory,
  totalRecordedMinutes,
  totalRecordedMinutesInRange,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

const RECENT_BLOCK_LIMIT = 5;

function formatHoursMinutes(totalMinutes: number, locale: "zh" | "en"): string {
  return formatDurationMinutes(totalMinutes, locale);
}

export default async function DashboardPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const user = await requireUser();
  const userTimeZone = await getUserCalendarTimeZone();
  const { todayStart, todayEnd, weekStart, weekEnd } = getDashboardDateRanges(
    new Date(),
    userTimeZone,
  );

  const [categories, todayBlocks, weekBlocks, weekFocusSessions, activeSession, anyTimeBlock, anyFocusSession, evaluatedGoals] =
    await Promise.all([
      categoriesForUser(user.id, { orderBy: { name: "asc" } }),
      timeBlocksForUser(user.id, {
        where: {
          startTime: { lt: todayEnd },
          endTime: { gt: todayStart },
        },
        include: { category: true },
        orderBy: { startTime: "asc" },
      }),
      timeBlocksForUser(user.id, {
        where: {
          startTime: { lt: weekEnd },
          endTime: { gt: weekStart },
        },
        include: { category: true },
        orderBy: { startTime: "desc" },
      }),
      focusSessionsForUser(user.id, {
        where: {
          startTime: { gte: weekStart, lt: weekEnd },
        },
        orderBy: { startTime: "asc" },
      }),
      activeFocusSessionForUser(user.id, {
        include: { category: true },
      }),
      timeBlocksForUser(user.id, { take: 1, select: { id: true } }),
      focusSessionsForUser(user.id, { take: 1, select: { id: true } }),
      ensureAndEvaluateGoalPeriodsForUser(user.id, userTimeZone),
    ]);

  const focusSessionsLite = weekFocusSessions.map((s) => ({
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    categoryId: s.categoryId,
    actualDurationMinutes: s.actualDurationMinutes,
    plannedDurationMinutes: s.plannedDurationMinutes,
    convertedToTimeBlock: s.convertedToTimeBlock,
  }));

  const todayFocusSessions = filterFocusSessionsByStartInRange(
    focusSessionsLite,
    todayStart,
    todayEnd,
  );
  const todayFocusSummary = summarizeFocusSessions(todayFocusSessions, categories);
  const weekFocusSummary = summarizeFocusSessions(focusSessionsLite, categories);

  const todayRecordedMinutes = totalRecordedMinutesInRange(
    todayBlocks,
    todayStart,
    todayEnd,
  );
  const weekRecordedMinutes = totalRecordedMinutesInRange(
    weekBlocks,
    weekStart,
    weekEnd,
  );

  const weekBlockCount = weekBlocks.length;

  const weekStatusCounts = completionStatusCounts(weekBlocks);

  const weekBlocksLite = weekBlocks.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
    categoryId: b.categoryId,
    status: b.status,
    completionLevel: b.completionLevel,
    efficiencyLevel: b.efficiencyLevel,
  }));

  const weekBlocksInRange = weekBlocksLite
    .map((b) => clipTimeBlockToWindow(b, weekStart, weekEnd))
    .filter((b): b is (typeof weekBlocksLite)[number] => b !== null);

  const weekCategoryMinutes = totalMinutesByCategory(
    weekBlocksInRange,
    categories,
  );
  const weekTotalMinutesForBreakdown = totalRecordedMinutes(weekBlocksInRange);

  const weekDailyTotals = dailyTotalsForSelectedWeek(
    weekBlocksLite,
    weekStart,
    userTimeZone,
  );

  const dailyBars = weekDailyTotals.map((d) => ({
    dayLabel: new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      weekday: "short",
      timeZone: userTimeZone,
    }).format(d.dayStart),
    hours: Math.round((d.totalMinutes / 60) * 10) / 10,
  }));

  const statusColor: Record<string, string> = {
    planned: "#f59e0b",
    partial: "#6366f1",
    skipped: "#a1a1aa",
    completed: "#22c55e",
  };

  const statusOrder = ["planned", "partial", "skipped", "completed"] as const;
  const statusBars = statusOrder.map((key) => ({
    statusLabel: t.status[key],
    count: weekStatusCounts.byStatus[key] ?? 0,
    color: statusColor[key],
  }));

  const timeFormatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: userTimeZone,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: userTimeZone,
  });

  const recentBlocks = weekBlocks.slice(0, RECENT_BLOCK_LIMIT).map((block) => ({
    id: block.id,
    title: block.title,
    categoryName: block.category.name,
    categoryColor: block.category.color,
    dateLabel: dateFormatter.format(block.startTime),
    timeRangeLabel: `${timeFormatter.format(block.startTime)} – ${timeFormatter.format(block.endTime)}`,
    durationLabel: formatDurationMinutes(
      durationMinutesSafe(block.startTime, block.endTime),
      locale,
    ),
  }));

  const runningDashboardSession: DashboardRunningSession | null = activeSession
    ? (() => {
        const category = categories.find(
          (item) => item.id === activeSession.categoryId,
        );
        if (!category) {
          return null;
        }
        return {
          id: activeSession.id,
          mode: activeSession.mode as "pomodoro" | "stopwatch",
          status: activeSession.status,
          title: activeSession.title,
          startTimeIso: activeSession.startTime.toISOString(),
          pausedAtIso: activeSession.pausedAt?.toISOString() ?? null,
          pausedTotalSeconds: activeSession.pausedTotalSeconds,
          plannedDurationMinutes: activeSession.plannedDurationMinutes,
          category: {
            name: category.name,
            color: category.color,
          },
        };
      })()
    : null;

  const startedAtLabel = runningDashboardSession
    ? formatMessage(t.dashboard.activeTimerStartedAt, {
        time: timeFormatter.format(new Date(runningDashboardSession.startTimeIso)),
      })
    : "";

  const completedCount = weekStatusCounts.byStatus.completed ?? 0;
  const completionRate =
    weekBlockCount > 0 ? Math.round((completedCount / weekBlockCount) * 100) : 0;

  const hasCategories = categories.length > 0;
  const hasRecords = anyTimeBlock.length > 0 || anyFocusSession.length > 0;

  const goalPreviewItems: DashboardGoalPreviewItem[] = evaluatedGoals
    .slice(0, 3)
    .map(({ goal, summary }) => ({
      goalId: goal.id,
      title: goal.title,
      summary,
    }));

  return (
    <DashboardView
      locale={locale}
      t={t}
      showOnboarding={!hasCategories || !hasRecords}
      onboardingSteps={{
        step1Done: hasCategories,
        step2Done: hasRecords,
        step3Done: hasCategories && hasRecords,
      }}
      todayRecordedLabel={formatHoursMinutes(todayRecordedMinutes, locale)}
      weekRecordedLabel={formatHoursMinutes(weekRecordedMinutes, locale)}
      focusSessionsLabel={String(weekFocusSummary.completedCount)}
      completedBlocksLabel={`${completedCount} / ${weekBlockCount}`}
      completionRateLabel={`${t.dashboard.completionRateLabel} ${completionRate}%`}
      runningSession={runningDashboardSession}
      startedAtLabel={startedAtLabel}
      quickStartCategories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
      }))}
      hasActiveSession={activeSession !== null}
      dailyBars={dailyBars}
      statusBars={statusBars}
      weekCategoryMinutes={weekCategoryMinutes}
      weekTotalMinutesForBreakdown={weekTotalMinutesForBreakdown}
      weekBlockCount={weekBlockCount}
      weekFocusSummary={weekFocusSummary}
      todayFocusSummary={todayFocusSummary}
      recentBlocks={recentBlocks}
      goalPreviewItems={goalPreviewItems}
    />
  );
}

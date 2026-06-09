import Link from "next/link";
import { formatMessage, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { DashboardCharts } from "@/components/dashboard-charts";
import {
  categoriesForUser,
  focusSessionsForUser,
  timeBlocksForUser,
} from "@/lib/db/scoped";
import { getDashboardDateRanges } from "@/lib/dashboard-ranges";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";
import { formatDurationMinutes } from "@/lib/time";
import {
  filterFocusSessionsByStartInRange,
  summarizeFocusSessions,
} from "@/lib/focus-stats";
import {
  completionStatusCounts,
  completionStatusTotalMinutes,
  clipTimeBlockToWindow,
  dailyTotalsForSelectedWeek,
  summarizeCompletionQuality,
  totalMinutesByCategory,
  totalRecordedMinutes,
  totalRecordedMinutesInRange,
  UNCATEGORIZED_ID,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

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

  const [categories, todayBlocks, weekBlocks, weekFocusSessions] =
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
        orderBy: { startTime: "asc" },
      }),
      focusSessionsForUser(user.id, {
        where: {
          startTime: { gte: weekStart, lt: weekEnd },
        },
        orderBy: { startTime: "asc" },
      }),
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

  const todayBlockCount = todayBlocks.length;
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

  const weekStatusMinutes = completionStatusTotalMinutes(weekBlocksInRange);
  const weekCategoryMinutes = totalMinutesByCategory(
    weekBlocksInRange,
    categories,
  );
  const weekTotalMinutesForBreakdown = totalRecordedMinutes(weekBlocksInRange);
  const weekCompletionQuality = summarizeCompletionQuality(
    weekBlocksInRange,
    categories,
  );

  const weekDailyTotals = dailyTotalsForSelectedWeek(
    weekBlocksLite,
    weekStart,
    userTimeZone,
  );

  const categoryPie = weekCategoryMinutes
    .filter((r) => r.totalMinutes > 0)
    .map((r) => ({
      name:
        r.categoryId === UNCATEGORIZED_ID
          ? t.dashboard.uncategorized
          : r.categoryName ?? t.dashboard.uncategorized,
      minutes: r.totalMinutes,
      color:
        r.categoryId === UNCATEGORIZED_ID
          ? "#a1a1aa"
          : r.categoryColor ?? "#a1a1aa",
    }));

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t.dashboard.subtitle}</p>
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold">{t.dashboard.overview}</h2>
        <p className="mb-4 text-sm text-zinc-500">{t.dashboard.timeBlocksSection}</p>
        <p className="mb-1 text-sm text-zinc-500">{t.dashboard.timeBlocksSectionNote}</p>
        {weekBlockCount === 0 ? (
          <p className="mb-4 text-sm text-zinc-500">
            {t.dashboard.noData}{" "}
            <span className="text-zinc-400">
              （{t.calendar.today} / {t.calendar.thisWeek}）
            </span>
          </p>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">
              {t.dashboard.todayTotalRecordedTime}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(todayRecordedMinutes, locale)}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">
              {t.dashboard.weekTotalRecordedTime}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(weekRecordedMinutes, locale)}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.review.skippedTime}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(weekCompletionQuality.totalSkippedMinutes, locale)}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.dashboard.todayTimeBlocks}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {String(todayBlockCount)}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.dashboard.weekTimeBlocks}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {String(weekBlockCount)}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.dashboard.statusCounts}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {String(weekStatusCounts.byStatus.completed ?? 0)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t.status.planned}：{weekStatusCounts.byStatus.planned ?? 0}
              <span className="mx-2 text-zinc-300">·</span>
              {t.status.partial}：{weekStatusCounts.byStatus.partial ?? 0}
              <span className="mx-2 text-zinc-300">·</span>
              {t.status.skipped}：{weekStatusCounts.byStatus.skipped ?? 0}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.timeBlocks.efficiency}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(weekCompletionQuality.lowEfficiencyMinutes, locale)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {locale === "zh" ? "低效率（low）" : "Low efficiency (low)"}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.dashboard.totalRecordedTime}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatDurationMinutes(weekStatusMinutes.totalMinutes, locale)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t.status.completed}：{" "}
              {formatDurationMinutes(
                weekStatusMinutes.byStatusMinutes.completed ?? 0,
                locale,
              )}
            </p>
          </li>
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/review/day"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {t.review.dayTitle}
          </Link>
          <Link
            href="/review/week"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {t.review.weekTitle}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">{t.dashboard.focusSection}</h2>
        <p className="mb-4 text-sm text-zinc-500">{t.dashboard.focusSectionNote}</p>

        {weekFocusSummary.completedCount === 0 &&
        weekFocusSummary.abandonedCount === 0 ? (
          <p className="mb-4 text-sm text-zinc-500">{t.dashboard.focusNoData}</p>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li className="rounded-lg border border-zinc-200 bg-white p-5 sm:col-span-2 lg:col-span-1">
            <p className="text-sm text-zinc-500">{t.dashboard.focusWeekTime}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(weekFocusSummary.totalFocusMinutes, locale)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t.dashboard.focusWeekTimeHint}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">
              {t.dashboard.focusConvertedFocusMinutes}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(weekFocusSummary.convertedFocusMinutes, locale)}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">
              {t.dashboard.focusUnconvertedFocusMinutes}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(
                weekFocusSummary.unconvertedFocusMinutes,
                locale,
              )}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.dashboard.focusTodayTime}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(todayFocusSummary.totalFocusMinutes, locale)}
            </p>
            {todayFocusSummary.totalFocusMinutes > 0 ? (
              <p className="mt-1 text-sm text-zinc-600">
                {t.dashboard.focusConvertedFocusMinutes}：{" "}
                {formatHoursMinutes(
                  todayFocusSummary.convertedFocusMinutes,
                  locale,
                )}
                <span className="mx-2 text-zinc-300">·</span>
                {t.dashboard.focusUnconvertedFocusMinutes}：{" "}
                {formatHoursMinutes(
                  todayFocusSummary.unconvertedFocusMinutes,
                  locale,
                )}
              </p>
            ) : null}
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">
              {t.dashboard.focusCompletedSessions}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {String(weekFocusSummary.completedCount)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t.dashboard.focusConvertedSessions}：{weekFocusSummary.convertedCount}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">
              {t.dashboard.focusAbandonedSessions}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {String(weekFocusSummary.abandonedCount)}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">
              {t.dashboard.focusCompletionRate}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {`${Math.round(weekFocusSummary.completionRate * 100)}%`}
            </p>
          </li>
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/focus"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {t.nav.focus}
          </Link>
        </div>

        <h3 className="mb-3 mt-8 text-base font-semibold text-zinc-900">
          {t.dashboard.focusByCategory}
        </h3>
        {weekFocusSummary.categoryBreakdown.length === 0 ? (
          <p className="text-sm text-zinc-500">{t.dashboard.focusNoData}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {weekFocusSummary.categoryBreakdown.map((row) => {
              const name =
                row.categoryId === UNCATEGORIZED_ID
                  ? t.dashboard.uncategorized
                  : row.categoryName ?? t.dashboard.uncategorized;
              const color =
                row.categoryId === UNCATEGORIZED_ID
                  ? "#a1a1aa"
                  : row.categoryColor ?? "#a1a1aa";
              const weekFocusTotal = weekFocusSummary.totalFocusMinutes;
              const percent =
                weekFocusTotal > 0
                  ? Math.round((row.totalMinutes / weekFocusTotal) * 100)
                  : 0;

              return (
                <li
                  key={row.categoryId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="font-medium text-zinc-900">{name}</span>
                  </div>
                  <div className="text-sm text-zinc-600">
                    <span className="font-medium text-zinc-800">
                      {formatHoursMinutes(row.totalMinutes, locale)}
                    </span>
                    <span className="mx-2 text-zinc-300">·</span>
                    <span>
                      {t.dashboard.percentOfTotal} {percent}%
                      <span className="mx-2 text-zinc-300">·</span>
                      {formatMessage(t.dashboard.focusSessionCount, {
                        count: row.sessionCount,
                      })}
                    </span>
                    {row.convertedSessionCount > 0 ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatMessage(t.dashboard.focusConvertedInCategory, {
                          count: row.convertedSessionCount,
                        })}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t.dashboard.charts}</h2>
        <DashboardCharts
          categoryPie={categoryPie}
          dailyBars={dailyBars}
          statusBars={statusBars}
          emptyLabel={t.dashboard.emptyChart}
          categoryTitle={t.dashboard.categoryBreakdownChart}
          dailyTitle={t.dashboard.weeklyDailyTotalsChart}
          statusTitle={t.dashboard.completionStatusChart}
        />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">{t.dashboard.byCategory}</h2>
        <p className="mb-4 text-sm text-zinc-500">{t.dashboard.timeBlocksSection}</p>
        <p className="mb-4 text-sm text-zinc-500">{t.dashboard.timeBlocksSectionNote}</p>
        {weekBlockCount === 0 ? (
          <p className="text-sm text-zinc-500">{t.dashboard.noData}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {weekCategoryMinutes.map((row) => {
              const name =
                row.categoryId === UNCATEGORIZED_ID
                  ? t.dashboard.uncategorized
                  : row.categoryName ?? t.dashboard.uncategorized;
              const color =
                row.categoryId === UNCATEGORIZED_ID
                  ? "#a1a1aa"
                  : row.categoryColor ?? "#a1a1aa";
              const percent =
                weekTotalMinutesForBreakdown > 0
                  ? Math.round((row.totalMinutes / weekTotalMinutesForBreakdown) * 100)
                  : 0;

              return (
              <li
                key={row.categoryId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="font-medium text-zinc-900">{name}</span>
                </div>
                <div className="text-sm text-zinc-600">
                  <span className="font-medium text-zinc-800">
                    {formatHoursMinutes(row.totalMinutes, locale)}
                  </span>
                  <span className="mx-2 text-zinc-300">·</span>
                  <span>
                    {t.dashboard.percentOfTotal} {percent}%
                    <span className="mx-2 text-zinc-300">·</span>
                    {formatMessage(t.dashboard.blockCount, {
                      count: row.blockCount,
                    })}
                  </span>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

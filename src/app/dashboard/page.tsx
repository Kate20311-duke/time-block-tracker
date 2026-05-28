import Link from "next/link";
import { formatMessage, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { DashboardCharts } from "@/components/dashboard-charts";
import { getDashboardDateRanges } from "@/lib/dashboard-ranges";
import { prisma } from "@/lib/prisma";
import { formatHoursFromMinutes } from "@/lib/time";
import {
  completionStatusCounts,
  completionStatusTotalMinutes,
  dailyStartTotalsForSelectedWeek,
  durationMinutesSafe,
  summarizeCompletionQuality,
  totalMinutesByCategory,
  totalRecordedMinutes,
  UNCATEGORIZED_ID,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

function formatHoursMinutes(totalMinutes: number, locale: "zh" | "en"): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "zh") {
    if (h > 0 && m > 0) return `${h} 小时 ${m} 分钟`;
    if (h > 0) return `${h} 小时`;
    return `${m} 分钟`;
  }
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export default async function DashboardPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const { todayStart, todayEnd, weekStart, weekEnd } = getDashboardDateRanges();

  const [categories, todayBlocks, weekBlocks] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.timeBlock.findMany({
      where: {
        startTime: { gte: todayStart, lt: todayEnd },
      },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.timeBlock.findMany({
      where: {
        startTime: { gte: weekStart, lt: weekEnd },
      },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const todayRecordedMinutes = todayBlocks.reduce(
    (sum, b) => sum + durationMinutesSafe(b.startTime, b.endTime),
    0,
  );
  const weekRecordedMinutes = weekBlocks.reduce(
    (sum, b) => sum + durationMinutesSafe(b.startTime, b.endTime),
    0,
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

  const weekStatusMinutes = completionStatusTotalMinutes(weekBlocksLite);
  const weekCategoryMinutes = totalMinutesByCategory(weekBlocksLite, categories);
  const weekTotalMinutesForBreakdown = totalRecordedMinutes(weekBlocksLite);
  const weekCompletionQuality = summarizeCompletionQuality(weekBlocksLite, categories);

  const weekDailyTotals = dailyStartTotalsForSelectedWeek(weekBlocksLite, weekStart);

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
        <h2 className="mb-4 text-lg font-semibold">{t.dashboard.overview}</h2>
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
            <p className="text-sm text-zinc-500">{t.review.totalPlannedTime}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(weekCompletionQuality.totalPlannedMinutes, locale)}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.review.estimatedCompletedTime}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {formatHoursMinutes(weekCompletionQuality.totalCompletedMinutes, locale)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t.review.completionRate}：{" "}
              {`${Math.round(weekCompletionQuality.completionRate * 100)}%`}
            </p>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{t.review.averageCompletionLevel}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {weekCompletionQuality.averageCompletionLevel}%
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t.review.skippedTime}：{" "}
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
              {formatHoursFromMinutes(weekStatusMinutes.totalMinutes)}{" "}
              {t.dashboard.hoursUnit}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {t.status.completed}：{" "}
              {formatHoursFromMinutes(
                weekStatusMinutes.byStatusMinutes.completed ?? 0,
              )}{" "}
              {t.dashboard.hoursUnit}
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
        <h2 className="mb-4 text-lg font-semibold">{t.dashboard.byCategory}</h2>
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

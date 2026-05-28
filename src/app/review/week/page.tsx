import Link from "next/link";
import { getDictionary, getStatusLabel } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import {
  endOfWeekMonday,
  formatCalendarDateParam,
  parseCalendarDateParam,
  startOfWeekMonday,
} from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import {
  dailyCompletionQualityForSelectedWeek,
  durationMinutesSafe,
  summarizeCompletionQuality,
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

function formatPercent(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  return `${Math.round(v * 100)}%`;
}

export default async function ReviewWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { date } = await searchParams;

  const selectedDay = parseCalendarDateParam(date);
  const weekStart = startOfWeekMonday(selectedDay);
  const weekEnd = endOfWeekMonday(selectedDay);
  const weekStartParam = formatCalendarDateParam(weekStart);

  const [categories, weekBlocks] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.timeBlock.findMany({
      where: { startTime: { gte: weekStart, lt: weekEnd } },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const weekBlocksLite = weekBlocks.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
    categoryId: b.categoryId,
    status: b.status,
    completionLevel: b.completionLevel,
    efficiencyLevel: b.efficiencyLevel,
  }));

  const summary = summarizeCompletionQuality(weekBlocksLite, categories);
  const daily = dailyCompletionQualityForSelectedWeek(
    weekBlocksLite,
    weekStart,
    categories,
  );

  const calendarHref = `/calendar?date=${encodeURIComponent(weekStartParam)}`;

  const reviewItems = weekBlocks.filter((b) => {
    if (b.status === "skipped") return true;
    if (b.status === "planned") return true;
    if (b.status === "partial" && b.completionLevel < 60) return true;
    return false;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t.review.weekTitle}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t.review.weekSubtitle}</p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.review.selectWeek}</span>
            <input
              name="date"
              type="date"
              defaultValue={weekStartParam}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t.review.view}
          </button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link
              href={calendarHref}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {t.review.backToCalendar}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {t.review.backToDashboard}
            </Link>
          </div>
        </form>
      </section>

      {weekBlocks.length === 0 ? (
        <p className="text-sm text-zinc-500">{t.review.emptyWeek}</p>
      ) : (
        <>
          <section>
            <h2 className="mb-4 text-lg font-semibold">{t.review.summary}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <li className="rounded-lg border border-zinc-200 bg-white p-5">
                <p className="text-sm text-zinc-500">{t.review.totalPlannedTime}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {formatHoursMinutes(summary.totalPlannedMinutes, locale)}
                </p>
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white p-5">
                <p className="text-sm text-zinc-500">
                  {t.review.estimatedCompletedTime}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {formatHoursMinutes(summary.totalCompletedMinutes, locale)}
                </p>
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white p-5">
                <p className="text-sm text-zinc-500">{t.review.skippedTime}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {formatHoursMinutes(summary.totalSkippedMinutes, locale)}
                </p>
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white p-5">
                <p className="text-sm text-zinc-500">{t.review.completionRate}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {formatPercent(summary.completionRate)}
                </p>
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white p-5">
                <p className="text-sm text-zinc-500">
                  {t.review.averageCompletionLevel}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">
                  {summary.averageCompletionLevel}%
                </p>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">
              {t.review.dailyBreakdown}
            </h2>
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {daily.map((d) => (
                <li key={d.dayStart.toISOString()} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-medium text-zinc-900">
                      {new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
                        weekday: "long",
                        month: "numeric",
                        day: "numeric",
                      }).format(d.dayStart)}
                    </span>
                    <span className="text-sm text-zinc-600">
                      {t.review.totalPlannedTime}{" "}
                      <span className="font-medium text-zinc-800">
                        {formatHoursMinutes(d.summary.totalPlannedMinutes, locale)}
                      </span>
                      <span className="mx-2 text-zinc-300">·</span>
                      {t.review.completionRate}{" "}
                      <span className="font-medium text-zinc-800">
                        {formatPercent(d.summary.completionRate)}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">
              {t.review.categoryBreakdown}
            </h2>
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {summary.categoryBreakdown.map((row) => (
                <li
                  key={row.categoryId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: row.categoryColor ?? "#a1a1aa" }}
                      aria-hidden
                    />
                    <span className="font-medium text-zinc-900">
                      {row.categoryName ?? t.dashboard.uncategorized}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600">
                    <span className="font-medium text-zinc-800">
                      {formatHoursMinutes(row.totalMinutes, locale)}
                    </span>
                    <span className="mx-2 text-zinc-300">·</span>
                    <span>{row.blockCount}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">
              {t.review.completionByCategory}
            </h2>
            {categories.length === 0 ? (
              <p className="text-sm text-zinc-500">{t.dashboard.emptyCategories}</p>
            ) : null}
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {summary.completionByCategory.map((row) => (
                <li key={row.categoryId} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-medium text-zinc-900">
                      {row.categoryId === "__uncategorized__"
                        ? t.dashboard.uncategorized
                        : categories.find((c) => c.id === row.categoryId)?.name ??
                          row.categoryId}
                    </span>
                    <span className="text-sm text-zinc-600">
                      {t.review.totalPlannedTime}{" "}
                      <span className="font-medium text-zinc-800">
                        {formatHoursMinutes(row.plannedMinutes, locale)}
                      </span>
                      <span className="mx-2 text-zinc-300">·</span>
                      {t.review.completionRate}{" "}
                      <span className="font-medium text-zinc-800">
                        {formatPercent(row.completionRate)}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">
              {t.review.itemsToReview}
            </h2>
            {reviewItems.length === 0 ? (
              <p className="text-sm text-zinc-500">—</p>
            ) : (
              <ul className="space-y-3">
                {reviewItems.map((b) => {
                  const minutes = durationMinutesSafe(b.startTime, b.endTime);
                  return (
                    <li
                      key={b.id}
                      className="rounded-lg border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: b.category.color }}
                              aria-hidden
                            />
                            <span className="font-medium text-zinc-900">
                              {b.title}
                            </span>
                            <span className="text-xs text-zinc-500">
                              · {minutes} {t.timeBlocks.minutesUnit}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-600">
                            {t.timeBlocks.status}：{getStatusLabel(b.status, locale)}
                            <span className="mx-2 text-zinc-300">·</span>
                            {t.timeBlocks.completion}：{b.completionLevel}%
                          </p>
                          {b.reviewNote ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                              {b.reviewNote}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}


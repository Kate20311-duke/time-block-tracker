import { ReviewCategoryBreakdown } from "@/components/review/review-category-breakdown";
import {
  ReviewDailyBreakdown,
  mapDailyBreakdownRows,
} from "@/components/review/review-daily-breakdown";
import { ReviewDateControls } from "@/components/review/review-date-controls";
import { ReviewEmptyState } from "@/components/review/review-empty-state";
import { ReviewModeNav } from "@/components/review/review-mode-nav";
import { ReviewPageHeader } from "@/components/review/review-page-header";
import { ReviewScopeNote } from "@/components/review/review-scope-note";
import {
  ReviewSummaryCards,
  buildReviewSummaryCards,
} from "@/components/review/review-summary-cards";
import { ReviewTimeBlockList } from "@/components/review/review-time-block-list";
import { formatMessage, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import {
  formatCalendarDateParam,
  getWeekQueryRange,
  parseCalendarDateParam,
} from "@/lib/calendar";
import { categoriesForUser, timeBlocksForUser } from "@/lib/db/scoped";
import {
  clipBlocksToRange,
  dailyCompletionQualityForSelectedWeek,
  summarizeCompletionQuality,
} from "@/lib/stats";
import { mapCategoryBreakdownRows } from "@/lib/review-category";
import {
  countCompletedBlocks,
  mapReviewTimeBlockListItems,
} from "@/lib/review-ui";
import { requireUser } from "@/lib/session";
import { formatDurationMinutes } from "@/lib/time";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

export default async function ReviewWeekPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { date } = await searchParams;

  const user = await requireUser();
  const userTimeZone = await getUserCalendarTimeZone();

  const selectedDay = parseCalendarDateParam(date, userTimeZone);
  const { weekStart, weekEnd } = getWeekQueryRange(selectedDay, userTimeZone);
  const weekStartParam = formatCalendarDateParam(weekStart, userTimeZone);

  const [categories, weekBlocks] = await Promise.all([
    categoriesForUser(user.id, { orderBy: { name: "asc" } }),
    timeBlocksForUser(user.id, {
      where: {
        startTime: { lt: weekEnd },
        endTime: { gt: weekStart },
      },
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

  const weekBlocksInRange = clipBlocksToRange(weekBlocksLite, weekStart, weekEnd);
  const summary = summarizeCompletionQuality(weekBlocksInRange, categories);
  const daily = dailyCompletionQualityForSelectedWeek(
    weekBlocksLite,
    weekStart,
    categories,
    userTimeZone,
  );

  const formatDuration = (minutes: number) =>
    formatDurationMinutes(minutes, locale);

  const calendarHref = `/calendar?date=${encodeURIComponent(weekStartParam)}`;
  const weeklyBadge = formatMessage(t.review.weeklyTotalBadge, {
    duration: formatDuration(summary.totalPlannedMinutes),
  });

  const reviewItems = weekBlocks.filter((b) => {
    if (b.status === "skipped") return true;
    if (b.status === "planned") return true;
    if (b.status === "partial") return true;
    return false;
  });

  const reviewListItems = mapReviewTimeBlockListItems(
    reviewItems,
    weekStart,
    weekEnd,
    userTimeZone,
    locale,
    "week",
  );
  const categoryRows = mapCategoryBreakdownRows(
    summary.categoryBreakdown,
    summary.totalPlannedMinutes,
  );
  const dailyRows = mapDailyBreakdownRows(daily, locale, userTimeZone);
  const summaryCards = buildReviewSummaryCards(
    summary,
    countCompletedBlocks(weekBlocksInRange),
    weekBlocksInRange.length,
    formatDuration,
    t.review,
  );

  return (
    <div className="flex flex-col gap-6">
      <ReviewPageHeader
        labels={{
          pageTitle: t.review.pageTitle,
          pageDescription: t.review.weekSubtitle,
        }}
      />

      <ReviewModeNav
        mode="week"
        dateParam={weekStartParam}
        labels={{ tabDay: t.review.tabDay, tabWeek: t.review.tabWeek }}
        weeklyBadge={weeklyBadge}
      />

      <ReviewDateControls
        mode="week"
        dateParam={weekStartParam}
        calendarHref={calendarHref}
        labels={{
          selectDate: t.review.selectDate,
          selectWeek: t.review.selectWeek,
          view: t.review.view,
          backToCalendar: t.review.backToCalendar,
          backToDashboard: t.review.backToDashboard,
        }}
      />

      <ReviewScopeNote label={t.review.scopeNote} />

      {weekBlocks.length === 0 ? (
        <ReviewEmptyState
          title={t.review.emptyWeek}
          description={t.review.emptyWeekHint}
          labels={{
            goToCalendar: t.review.goToCalendar,
            goToFocusStopwatch: t.review.goToFocusStopwatch,
          }}
        />
      ) : (
        <>
          <ReviewSummaryCards cards={summaryCards} />

          <ReviewDailyBreakdown
            title={t.review.dailyBreakdown}
            description={t.dashboard.weeklyDistributionHint}
            rows={dailyRows}
            formatDuration={formatDuration}
          />

          <ReviewCategoryBreakdown
            title={t.review.categoryBreakdown}
            description={t.review.categoryShareHint}
            rows={categoryRows}
            locale={locale}
            uncategorizedLabel={t.dashboard.uncategorized}
          />

          <ReviewTimeBlockList
            title={t.review.itemsToReview}
            items={reviewListItems}
            locale={locale}
          />
        </>
      )}
    </div>
  );
}

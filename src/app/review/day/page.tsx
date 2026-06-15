import { ReviewCategoryBreakdown } from "@/components/review/review-category-breakdown";
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
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import {
  formatCalendarDateParam,
  getDayQueryRange,
  parseCalendarDateParam,
} from "@/lib/calendar";
import { categoriesForUser, timeBlocksForUser } from "@/lib/db/scoped";
import {
  clipBlocksToRange,
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

export default async function ReviewDayPage({
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
  const dateParam = formatCalendarDateParam(selectedDay, userTimeZone);
  const { dayStart, dayEnd } = getDayQueryRange(selectedDay, userTimeZone);

  const [categories, timeBlocks] = await Promise.all([
    categoriesForUser(user.id, { orderBy: { name: "asc" } }),
    timeBlocksForUser(user.id, {
      where: {
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const blocksLite = timeBlocks.map((b) => ({
    startTime: b.startTime,
    endTime: b.endTime,
    categoryId: b.categoryId,
    status: b.status,
    completionLevel: b.completionLevel,
    efficiencyLevel: b.efficiencyLevel,
  }));

  const blocksInDay = clipBlocksToRange(blocksLite, dayStart, dayEnd);
  const summary = summarizeCompletionQuality(blocksInDay, categories);
  const formatDuration = (minutes: number) =>
    formatDurationMinutes(minutes, locale);

  const calendarHref = `/calendar?date=${encodeURIComponent(dateParam)}&view=day`;
  const incompleteOrSkipped = timeBlocks.filter((b) => b.status !== "completed");
  const listItems = mapReviewTimeBlockListItems(
    timeBlocks,
    dayStart,
    dayEnd,
    userTimeZone,
    locale,
    "day",
  );
  const incompleteItems = mapReviewTimeBlockListItems(
    incompleteOrSkipped,
    dayStart,
    dayEnd,
    userTimeZone,
    locale,
    "day",
  );
  const categoryRows = mapCategoryBreakdownRows(
    summary.categoryBreakdown,
    summary.totalPlannedMinutes,
  );
  const summaryCards = buildReviewSummaryCards(
    summary,
    countCompletedBlocks(blocksInDay),
    blocksInDay.length,
    formatDuration,
    t.review,
  );

  return (
    <div className="flex flex-col gap-6">
      <ReviewPageHeader
        labels={{
          pageTitle: t.review.pageTitle,
          pageDescription: t.review.daySubtitle,
        }}
      />

      <ReviewModeNav
        mode="day"
        dateParam={dateParam}
        labels={{ tabDay: t.review.tabDay, tabWeek: t.review.tabWeek }}
      />

      <ReviewDateControls
        mode="day"
        dateParam={dateParam}
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

      {timeBlocks.length === 0 ? (
        <ReviewEmptyState
          title={t.review.emptyDay}
          description={t.review.emptyDayHint}
          labels={{
            goToCalendar: t.review.goToCalendar,
            goToFocusStopwatch: t.review.goToFocusStopwatch,
          }}
        />
      ) : (
        <>
          <ReviewSummaryCards cards={summaryCards} />

          <ReviewCategoryBreakdown
            title={t.review.categoryBreakdown}
            description={t.review.categoryShareHint}
            rows={categoryRows}
            locale={locale}
            uncategorizedLabel={t.dashboard.uncategorized}
          />

          <ReviewTimeBlockList
            title={t.review.incompleteOrSkipped}
            items={incompleteItems}
            locale={locale}
          />

          <ReviewTimeBlockList
            title={t.review.allBlocks}
            items={listItems}
            locale={locale}
          />
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { CalendarEmptyState } from "@/components/calendar-empty-state";
import { CalendarInteractiveView } from "@/components/calendar-interactive-view";
import { CalendarPageHeader } from "@/components/calendar-page-header";
import { CalendarToolbar } from "@/components/calendar-toolbar";
import { PageFeedback } from "@/components/page-feedback";
import { toCalendarEditBlockData } from "@/lib/calendar-edit";
import type { CalendarColumnBlock } from "@/components/calendar-day-column";
import {
  addCalendarDays,
  addCalendarWeeks,
  formatCalendarDateParam,
  formatCalendarDayHeading,
  formatWeekRangeHeading,
  getDayQueryRange,
  getWeekDays,
  getWeekQueryRange,
  getVisibleSegmentInDay,
  layoutBlocksInDay,
  layoutBlockInDay,
  parseCalendarDateParam,
  parseCalendarViewParam,
  startOfWeekMonday,
  type CalendarView,
} from "@/lib/calendar";
import { TIME_BLOCK_STATUSES } from "@/lib/constants";
import {
  formatMessage,
  getDictionary,
  getStatusLabel,
  type Dictionary,
} from "@/lib/i18n";
import { categoriesForUser, timeBlocksForUser } from "@/lib/db/scoped";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

const CALENDAR_ERROR_MAP = {
  missing_fields: "missingFields",
  invalid_range: "invalidRange",
  invalid_status: "invalidStatus",
  invalid_completion: "invalidCompletion",
  update_failed: "updateFailed",
  delete_failed: "deleteFailed",
} as const;

type CalendarErrorParam = keyof typeof CALENDAR_ERROR_MAP;

function buildCalendarHref(
  date: Date,
  view: CalendarView,
  timeZone: string,
  blockId?: string,
): string {
  const params = new URLSearchParams({
    date: formatCalendarDateParam(date, timeZone),
  });
  if (view === "day") {
    params.set("view", "day");
  }
  if (blockId) {
    params.set("blockId", blockId);
  }
  return `/calendar?${params.toString()}`;
}

function resolveCalendarError(
  error: string | undefined,
  t: Dictionary,
): string | null {
  if (!error || !(error in CALENDAR_ERROR_MAP)) return null;
  const key = CALENDAR_ERROR_MAP[error as CalendarErrorParam];
  return t.timeBlocks.errors[key];
}

function resolveCalendarSuccess(
  success: string | undefined,
  t: Dictionary,
): string | null {
  if (success === "updated") return t.timeBlocks.success.updated;
  if (success === "created") return t.timeBlocks.success.created;
  if (success === "deleted") return t.timeBlocks.success.deleted;
  return null;
}

type TimeBlockWithCategory = {
  id: string;
  title: string;
  note: string | null;
  categoryId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  completionLevel: number;
  category: { name: string; color: string };
};

function mapBlocksForDay(
  timeBlocks: TimeBlockWithCategory[],
  day: Date,
  timeZone: string,
): CalendarColumnBlock[] {
  const dayLayouts = layoutBlocksInDay(
    timeBlocks.map((block) => ({
      startTime: block.startTime,
      endTime: block.endTime,
    })),
    day,
    timeZone,
  );

  return timeBlocks
    .map((block) => {
      const segment = getVisibleSegmentInDay(
        { startTime: block.startTime, endTime: block.endTime },
        day,
        timeZone,
      );
      if (!segment) return null;

      const layout = dayLayouts.find(
        (l) =>
          l.visibleStart.getTime() === segment.visibleStart.getTime() &&
          l.visibleEnd.getTime() === segment.visibleEnd.getTime(),
      );
      if (!layout) return null;

      const dayKey = formatCalendarDateParam(day, timeZone);
      return {
        id: `${block.id}-${dayKey}`,
        blockId: block.id,
        title: block.title,
        categoryName: block.category.name,
        color: block.category.color,
        status: block.status,
        completionLevel: block.completionLevel,
        layout,
        startTimeIso: block.startTime.toISOString(),
        endTimeIso: block.endTime.toISOString(),
      };
    })
    .filter((block): block is CalendarColumnBlock => block !== null);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    view?: string;
    blockId?: string;
    success?: string;
    error?: string;
  }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const {
    date: dateParam,
    view: viewParam,
    blockId: blockIdParam,
    success,
    error,
  } = await searchParams;

  const successMessage = resolveCalendarSuccess(success, t);
  const errorMessage = resolveCalendarError(error, t);

  const user = await requireUser();
  const userTimeZone = await getUserCalendarTimeZone();

  const view = parseCalendarViewParam(viewParam);
  const selectedDay = parseCalendarDateParam(dateParam, userTimeZone);
  const calendarDate = formatCalendarDateParam(selectedDay, userTimeZone);
  const today = parseCalendarDateParam(undefined, userTimeZone);
  const todayKey = formatCalendarDateParam(today, userTimeZone);
  const isToday =
    formatCalendarDateParam(selectedDay, userTimeZone) === todayKey;

  const weekStart = startOfWeekMonday(selectedDay, userTimeZone);
  const currentWeekStart = startOfWeekMonday(today, userTimeZone);
  const isCurrentWeek =
    formatCalendarDateParam(weekStart, userTimeZone) ===
    formatCalendarDateParam(currentWeekStart, userTimeZone);

  const rangeStart =
    view === "week"
      ? getWeekQueryRange(selectedDay, userTimeZone).weekStart
      : getDayQueryRange(selectedDay, userTimeZone).dayStart;
  const rangeEnd =
    view === "week"
      ? getWeekQueryRange(selectedDay, userTimeZone).weekEnd
      : getDayQueryRange(selectedDay, userTimeZone).dayEnd;

  const [timeBlocks, categories] = await Promise.all([
    timeBlocksForUser(user.id, {
      where: {
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    categoriesForUser(user.id, { orderBy: { name: "asc" } }),
  ]);

  const selectedBlockInRange = blockIdParam
    ? timeBlocks.find((b) => b.id === blockIdParam)
    : undefined;

  let selectedBlockRaw = selectedBlockInRange ?? null;
  if (!selectedBlockRaw && blockIdParam) {
    const [ownedBlock] = await timeBlocksForUser(user.id, {
      where: { id: blockIdParam },
      include: { category: true },
    });
    selectedBlockRaw = ownedBlock ?? null;
  }

  const selectedBlock = selectedBlockRaw
    ? toCalendarEditBlockData(selectedBlockRaw)
    : null;

  const hasBlocks = timeBlocks.some((block) => {
    if (view === "day") {
      return layoutBlockInDay(
        { startTime: block.startTime, endTime: block.endTime },
        selectedDay,
        userTimeZone,
      );
    }
    return getWeekDays(weekStart, userTimeZone).some((day) =>
      layoutBlockInDay(
        { startTime: block.startTime, endTime: block.endTime },
        day,
        userTimeZone,
      ),
    );
  });

  const prevAnchor =
    view === "week"
      ? addCalendarWeeks(selectedDay, -1, userTimeZone)
      : addCalendarDays(selectedDay, -1, userTimeZone);
  const nextAnchor =
    view === "week"
      ? addCalendarWeeks(selectedDay, 1, userTimeZone)
      : addCalendarDays(selectedDay, 1, userTimeZone);

  const statusOptions = TIME_BLOCK_STATUSES.map((s) => ({
    value: s,
    label: getStatusLabel(s, locale),
  }));

  const efficiencyOptions = [
    { value: "low", label: locale === "zh" ? "低" : "Low" },
    { value: "medium", label: locale === "zh" ? "中" : "Medium" },
    { value: "high", label: locale === "zh" ? "高" : "High" },
  ];

  const formLabels = {
    panelAria: t.calendar.edit.panelAria,
    titleLabel: t.timeBlocks.titleLabel,
    category: t.timeBlocks.category,
    startTime: t.timeBlocks.startTime,
    endTime: t.timeBlocks.endTime,
    noteOptional: t.timeBlocks.noteOptional,
    reviewNoteOptional: t.timeBlocks.reviewNoteOptional,
    status: t.timeBlocks.status,
    efficiencyOptional: t.timeBlocks.efficiencyOptional,
    selectEfficiency: t.timeBlocks.selectEfficiency,
    save: t.common.save,
    cancel: t.common.cancel,
    delete: t.common.delete,
    confirmDelete: selectedBlockRaw
      ? formatMessage(t.timeBlocks.confirmDelete, {
          title: selectedBlockRaw.title,
        })
      : "",
    confirmDeleteTitle: t.common.confirmDeleteTitle,
    submitting: t.common.submitting,
    completion: t.timeBlocks.completion,
    minutesUnit: t.timeBlocks.minutesUnit,
  };

  const createFormLabels = {
    panelAria: t.calendar.create.panelAria,
    heading: t.calendar.create.heading,
    titleLabel: t.timeBlocks.titleLabel,
    titlePlaceholder: t.timeBlocks.titlePlaceholder,
    category: t.timeBlocks.category,
    selectCategory: t.timeBlocks.selectCategory,
    startTime: t.timeBlocks.startTime,
    endTime: t.timeBlocks.endTime,
    noteOptional: t.timeBlocks.noteOptional,
    status: t.timeBlocks.status,
    save: t.common.save,
    cancel: t.common.cancel,
    submitting: t.common.submitting,
  };

  const heading =
    view === "week"
      ? formatWeekRangeHeading(weekStart, locale, userTimeZone)
      : formatCalendarDayHeading(selectedDay, locale, userTimeZone);

  return (
    <div className="space-y-6">
      <CalendarPageHeader
        labels={{
          title: t.calendar.title,
          pageDescription: t.calendar.pageDescription,
        }}
      />

      <CalendarToolbar
        view={view}
        heading={heading}
        weekViewHref={buildCalendarHref(selectedDay, "week", userTimeZone)}
        dayViewHref={buildCalendarHref(selectedDay, "day", userTimeZone)}
        prevHref={buildCalendarHref(prevAnchor, view, userTimeZone)}
        nextHref={buildCalendarHref(nextAnchor, view, userTimeZone)}
        todayHref={
          view === "week"
            ? !isCurrentWeek
              ? buildCalendarHref(today, "week", userTimeZone)
              : undefined
            : !isToday
              ? buildCalendarHref(today, "day", userTimeZone)
              : undefined
        }
        todayLabel={view === "week" ? t.calendar.thisWeek : t.calendar.today}
        prevLabel={view === "week" ? t.calendar.prevWeek : t.calendar.prevDay}
        nextLabel={view === "week" ? t.calendar.nextWeek : t.calendar.nextDay}
        labels={{
          viewSwitcherAria: t.calendar.viewSwitcherAria,
          weekView: t.calendar.weekView,
          dayView: t.calendar.dayView,
          dateNavAria: t.calendar.dateNavAria,
        }}
      />

      <PageFeedback
        successMessage={successMessage}
        errorMessage={errorMessage}
        errorTitle={t.common.errorTitle}
      />

      {!hasBlocks ? (
        <CalendarEmptyState
          title={view === "week" ? t.calendar.emptyWeek : t.calendar.empty}
          description={t.calendar.emptyHint}
        />
      ) : null}

      <Suspense fallback={null}>
        <CalendarInteractiveView
          locale={locale}
          view={view}
          calendarDate={calendarDate}
          selectedBlockId={blockIdParam}
          selectedBlock={selectedBlock}
          editPanelKey={
            selectedBlockRaw
              ? `${selectedBlockRaw.id}-${selectedBlockRaw.updatedAt.getTime()}`
              : undefined
          }
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          statusOptions={statusOptions}
          efficiencyOptions={efficiencyOptions}
          userTimeZone={userTimeZone}
          startTimeIso={
            selectedBlockRaw ? selectedBlockRaw.startTime.toISOString() : ""
          }
          endTimeIso={
            selectedBlockRaw ? selectedBlockRaw.endTime.toISOString() : ""
          }
          formLabels={formLabels}
          createFormLabels={createFormLabels}
          emptySlotHintMessage={t.calendar.create.emptySlotHint}
          notFoundMessage={t.calendar.detail.notFound}
          noCategoriesMessage={t.timeBlocks.cannotEditNoCategories}
          dragSaveFailedMessage={t.calendar.drag.saveFailed}
          weekViewDragHintMessage={t.calendar.drag.weekViewHint}
          continuedSegmentLabel={t.calendar.continuedSegment}
          dragDisabledInWeekHint={t.calendar.drag.dragDisabledInWeek}
          newTimeBlockLabel={t.calendar.newTimeBlock}
          completionLabel={t.timeBlocks.completion}
          dayBlocks={
            view === "day"
              ? mapBlocksForDay(timeBlocks, selectedDay, userTimeZone)
              : undefined
          }
          weekColumns={
            view === "week"
              ? getWeekDays(weekStart, userTimeZone).map((day) => {
                  const dayKey = formatCalendarDateParam(day, userTimeZone);
                  return {
                    day,
                    dayHref: buildCalendarHref(day, "day", userTimeZone),
                    isToday: dayKey === todayKey,
                    blocks: mapBlocksForDay(timeBlocks, day, userTimeZone),
                  };
                })
              : undefined
          }
        />
      </Suspense>

      <p className="text-sm text-muted-foreground">
        {t.calendar.editHintPrefix}{" "}
        <Link href="/time-blocks" className="font-medium text-primary underline-offset-4 hover:underline">
          {t.calendar.editHintLink}
        </Link>
        {t.calendar.editHintSuffix}
      </p>
    </div>
  );
}

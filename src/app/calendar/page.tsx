import Link from "next/link";
import { Suspense } from "react";
import { CalendarInteractiveView } from "@/components/calendar-interactive-view";
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
import { getDictionary, getStatusLabel, type Dictionary } from "@/lib/i18n";
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
    completionRange: t.timeBlocks.completionRange,
    efficiencyOptional: t.timeBlocks.efficiencyOptional,
    selectEfficiency: t.timeBlocks.selectEfficiency,
    save: t.common.save,
    cancel: t.common.cancel,
    submitting: t.common.submitting,
  };

  const viewSwitcherClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-zinc-900 text-white"
        : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.calendar.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t.calendar.subtitle}</p>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t.calendar.viewSwitcherAria}
      >
        <Link
          href={buildCalendarHref(selectedDay, "week", userTimeZone)}
          className={viewSwitcherClass(view === "week")}
        >
          {t.calendar.weekView}
        </Link>
        <Link
          href={buildCalendarHref(selectedDay, "day", userTimeZone)}
          className={viewSwitcherClass(view === "day")}
        >
          {t.calendar.dayView}
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold text-zinc-900">
          {view === "week"
            ? formatWeekRangeHeading(weekStart, locale, userTimeZone)
            : formatCalendarDayHeading(selectedDay, locale, userTimeZone)}
        </p>
        <nav
          aria-label={t.calendar.dateNavAria}
          className="flex flex-wrap items-center gap-2"
        >
          {view === "week" ? (
            <>
              <Link
                href={buildCalendarHref(prevAnchor, "week", userTimeZone)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {t.calendar.prevWeek}
              </Link>
              {!isCurrentWeek ? (
                <Link
                  href={buildCalendarHref(today, "week", userTimeZone)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  {t.calendar.thisWeek}
                </Link>
              ) : null}
              <Link
                href={buildCalendarHref(nextAnchor, "week", userTimeZone)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {t.calendar.nextWeek}
              </Link>
            </>
          ) : (
            <>
              <Link
                href={buildCalendarHref(prevAnchor, "day", userTimeZone)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {t.calendar.prevDay}
              </Link>
              {!isToday ? (
                <Link
                  href={buildCalendarHref(today, "day", userTimeZone)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  {t.calendar.today}
                </Link>
              ) : null}
              <Link
                href={buildCalendarHref(nextAnchor, "day", userTimeZone)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {t.calendar.nextDay}
              </Link>
            </>
          )}
        </nav>
      </div>

      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {errorMessage}
        </div>
      ) : null}

      {!hasBlocks ? (
        <p className="text-sm text-zinc-500">
          {view === "week" ? t.calendar.emptyWeek : t.calendar.empty}
        </p>
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
          notFoundMessage={t.calendar.detail.notFound}
          noCategoriesMessage={t.timeBlocks.cannotEditNoCategories}
          dragSaveFailedMessage={t.calendar.drag.saveFailed}
          weekViewDragHintMessage={t.calendar.drag.weekViewHint}
          continuedSegmentLabel={t.calendar.continuedSegment}
          dragDisabledInWeekHint={t.calendar.drag.dragDisabledInWeek}
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

      <p className="text-sm text-zinc-500">
        {t.calendar.editHintPrefix}{" "}
        <Link href="/time-blocks" className="font-medium text-zinc-800 underline">
          {t.calendar.editHintLink}
        </Link>
        {t.calendar.editHintSuffix}
      </p>
    </div>
  );
}

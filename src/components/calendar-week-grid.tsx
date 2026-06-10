"use client";

import Link from "next/link";
import {
  CalendarDayColumn,
  GRID_HEIGHT_PX,
  HOUR_ROW_PX,
  type CalendarColumnBlock,
} from "@/components/calendar-day-column";
import {
  formatCalendarColumnHeading,
  formatCalendarDateParam,
  formatHourLabel,
  getHourLabels,
} from "@/lib/calendar";
import { canDragCalendarColumnBlockInWeekView } from "@/lib/week-view-drag";
import type { Locale } from "@/lib/i18n/types";

export type WeekGridColumn = {
  day: Date;
  dayHref: string;
  isToday: boolean;
  blocks: CalendarColumnBlock[];
};

type Props = {
  locale: Locale;
  userTimeZone: string;
  columns: WeekGridColumn[];
  selectedBlockId?: string;
  continuedSegmentLabel: string;
  completionLabel: string;
  dragDisabledHint: string;
  onBlockSelect: (blockId: string) => void;
  onScheduleSaveEnd: (ok: boolean) => void;
  onEmptySlotClick?: (startTimeIso: string, endTimeIso: string) => void;
};

export function CalendarWeekGrid({
  locale,
  userTimeZone,
  columns,
  selectedBlockId,
  continuedSegmentLabel,
  completionLabel,
  dragDisabledHint,
  onBlockSelect,
  onScheduleSaveEnd,
  onEmptySlotClick,
}: Props) {
  const hours = getHourLabels();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-2 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1 sm:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] sm:gap-1.5">
          <div />
          {columns.map((column) => (
            <div
              key={column.dayHref}
              className={`rounded-md px-1 py-1.5 text-center text-xs font-medium sm:text-sm ${
                column.isToday
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Link
                href={column.dayHref}
                className="block hover:underline"
                title={formatCalendarColumnHeading(column.day, locale, userTimeZone)}
              >
                {formatCalendarColumnHeading(column.day, locale, userTimeZone)}
              </Link>
            </div>
          ))}
        </div>

        <div className="flex gap-1 sm:gap-1.5">
          <div
            className="w-12 shrink-0 text-right text-xs text-muted-foreground sm:w-14"
            style={{ height: GRID_HEIGHT_PX }}
            aria-hidden
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-t border-transparent first:border-transparent"
                style={{ height: HOUR_ROW_PX }}
              >
                <span className="absolute -top-2 right-0 leading-none">
                  {formatHourLabel(hour, locale)}
                </span>
              </div>
            ))}
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-1.5">
            {columns.map((column) => (
              <CalendarDayColumn
                key={column.dayHref}
                locale={locale}
                userTimeZone={userTimeZone}
                blocks={column.blocks}
                selectedBlockId={selectedBlockId}
                continuedSegmentLabel={continuedSegmentLabel}
                completionLabel={completionLabel}
                compact
                enableDrag
                canDragBlock={(block) =>
                  canDragCalendarColumnBlockInWeekView(block, userTimeZone)
                }
                dragDisabledHint={dragDisabledHint}
                calendarDate={formatCalendarDateParam(column.day, userTimeZone)}
                onScheduleSaveEnd={onScheduleSaveEnd}
                onBlockSelect={onBlockSelect}
                onEmptySlotClick={onEmptySlotClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  formatHourLabel,
  getHourLabels,
} from "@/lib/calendar";
import type { Locale } from "@/lib/i18n/types";

export type WeekGridColumn = {
  day: Date;
  dayHref: string;
  isToday: boolean;
  blocks: CalendarColumnBlock[];
};

type Props = {
  locale: Locale;
  columns: WeekGridColumn[];
  selectedBlockId?: string;
  onBlockSelect: (blockId: string) => void;
};

export function CalendarWeekGrid({
  locale,
  columns,
  selectedBlockId,
  onBlockSelect,
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
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              <Link
                href={column.dayHref}
                className="block hover:underline"
                title={formatCalendarColumnHeading(column.day, locale)}
              >
                {formatCalendarColumnHeading(column.day, locale)}
              </Link>
            </div>
          ))}
        </div>

        <div className="flex gap-1 sm:gap-1.5">
          <div
            className="w-12 shrink-0 text-right text-xs text-zinc-500 sm:w-14"
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
                blocks={column.blocks}
                selectedBlockId={selectedBlockId}
                compact
                onBlockSelect={onBlockSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

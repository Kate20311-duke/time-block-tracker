"use client";

import {
  CalendarDayColumn,
  GRID_HEIGHT_PX,
  HOUR_ROW_PX,
  type CalendarColumnBlock,
} from "@/components/calendar-day-column";
import { formatHourLabel, getHourLabels } from "@/lib/calendar";
import type { Locale } from "@/lib/i18n/types";

export type CalendarGridBlock = CalendarColumnBlock;

type Props = {
  locale: Locale;
  blocks: CalendarGridBlock[];
  selectedBlockId?: string;
  calendarDate: string;
  onBlockSelect: (blockId: string) => void;
  onScheduleSaveEnd: (ok: boolean) => void;
};

export function CalendarDayGrid({
  locale,
  blocks,
  selectedBlockId,
  calendarDate,
  onBlockSelect,
  onScheduleSaveEnd,
}: Props) {
  const hours = getHourLabels();

  return (
    <div className="flex gap-2 sm:gap-3">
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

      <CalendarDayColumn
        locale={locale}
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onBlockSelect={onBlockSelect}
        enableDrag
        calendarDate={calendarDate}
        onScheduleSaveEnd={onScheduleSaveEnd}
      />
    </div>
  );
}

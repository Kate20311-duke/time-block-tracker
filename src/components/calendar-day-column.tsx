"use client";

import { useRef } from "react";
import { CalendarBlock } from "@/components/calendar-block";
import { CalendarDraggableBlock } from "@/components/calendar-draggable-block";
import {
  CALENDAR_GRID_HEIGHT_PX,
  formatTimeOfDay,
  getHourLabels,
  HOUR_ROW_PX,
  type DayBlockLayout,
} from "@/lib/calendar";
import type { Locale } from "@/lib/i18n/types";

export type CalendarColumnBlock = {
  id: string;
  blockId: string;
  title: string;
  categoryName: string;
  color: string;
  layout: DayBlockLayout;
  startTimeIso: string;
  endTimeIso: string;
};

type Props = {
  locale: Locale;
  blocks: CalendarColumnBlock[];
  selectedBlockId?: string;
  compact?: boolean;
  onBlockSelect: (blockId: string) => void;
  /** Day view: vertical drag to reschedule. */
  enableDrag?: boolean;
  calendarDate?: string;
  onScheduleSaveEnd?: (ok: boolean) => void;
};

export const GRID_HEIGHT_PX = CALENDAR_GRID_HEIGHT_PX;
export { HOUR_ROW_PX };

export function CalendarDayColumn({
  locale,
  blocks,
  selectedBlockId,
  compact = false,
  onBlockSelect,
  enableDrag = false,
  calendarDate,
  onScheduleSaveEnd,
}: Props) {
  const hours = getHourLabels();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const timeLabel = (block: CalendarColumnBlock) =>
    `${formatTimeOfDay(block.layout.visibleStart, locale)} – ${formatTimeOfDay(block.layout.visibleEnd, locale)}`;

  return (
    <div
      className="relative min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white"
      style={{ height: GRID_HEIGHT_PX }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute right-0 left-0 border-t border-zinc-100"
          style={{ top: hour * HOUR_ROW_PX, height: HOUR_ROW_PX }}
        />
      ))}

      <div ref={gridContainerRef} className="relative h-full">
        {blocks.map((block) =>
          enableDrag && calendarDate && onScheduleSaveEnd ? (
            <CalendarDraggableBlock
              key={block.id}
              blockId={block.blockId}
              startTimeIso={block.startTimeIso}
              endTimeIso={block.endTimeIso}
              calendarDate={calendarDate}
              gridContainerRef={gridContainerRef}
              title={block.title}
              categoryName={block.categoryName}
              color={block.color}
              timeLabel={timeLabel(block)}
              topPercent={block.layout.topPercent}
              heightPercent={block.layout.heightPercent}
              isSelected={selectedBlockId === block.blockId}
              onSelect={onBlockSelect}
              onSaveEnd={onScheduleSaveEnd}
            />
          ) : (
            <CalendarBlock
              key={block.id}
              title={block.title}
              categoryName={block.categoryName}
              color={block.color}
              timeLabel={timeLabel(block)}
              topPercent={block.layout.topPercent}
              heightPercent={block.layout.heightPercent}
              blockId={block.blockId}
              isSelected={selectedBlockId === block.blockId}
              compact={compact}
              onSelect={onBlockSelect}
            />
          ),
        )}
      </div>
    </div>
  );
}

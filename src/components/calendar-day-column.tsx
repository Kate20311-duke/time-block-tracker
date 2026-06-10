"use client";

import { useCallback, useRef } from "react";
import { slotTimesFromGridClick } from "@/lib/calendar-slot-create";
import { CalendarBlock } from "@/components/calendar-block";
import { CalendarDraggableBlock } from "@/components/calendar-draggable-block";
import {
  CALENDAR_GRID_HEIGHT_PX,
  formatCalendarBlockTimeLabel,
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
  status: string;
  completionLevel: number;
  layout: DayBlockLayout;
  startTimeIso: string;
  endTimeIso: string;
};

type Props = {
  locale: Locale;
  userTimeZone: string;
  blocks: CalendarColumnBlock[];
  selectedBlockId?: string;
  compact?: boolean;
  continuedSegmentLabel: string;
  completionLabel: string;
  onBlockSelect: (blockId: string) => void;
  /** Enables drag for blocks that pass canDragBlock (default: all). */
  enableDrag?: boolean;
  canDragBlock?: (block: CalendarColumnBlock) => boolean;
  /** Shown on non-draggable blocks when enableDrag is on (e.g. week cross-midnight). */
  dragDisabledHint?: string;
  calendarDate?: string;
  onScheduleSaveEnd?: (ok: boolean) => void;
  /** Fired when the user clicks empty space in the day column grid. */
  onEmptySlotClick?: (startTimeIso: string, endTimeIso: string) => void;
};

export const GRID_HEIGHT_PX = CALENDAR_GRID_HEIGHT_PX;
export { HOUR_ROW_PX };

export function CalendarDayColumn({
  locale,
  userTimeZone,
  blocks,
  selectedBlockId,
  compact = false,
  continuedSegmentLabel,
  completionLabel,
  onBlockSelect,
  enableDrag = false,
  canDragBlock,
  dragDisabledHint,
  calendarDate,
  onScheduleSaveEnd,
  onEmptySlotClick,
}: Props) {
  const hours = getHourLabels();
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleGridClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onEmptySlotClick || !calendarDate) return;
      if (event.target !== event.currentTarget) return;

      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const slot = slotTimesFromGridClick(
        calendarDate,
        event.clientY - rect.top,
        rect.height,
        userTimeZone,
      );
      if (slot) {
        onEmptySlotClick(slot.startTimeIso, slot.endTimeIso);
      }
    },
    [calendarDate, onEmptySlotClick, userTimeZone],
  );
  const timeLabel = (block: CalendarColumnBlock) =>
    formatCalendarBlockTimeLabel(
      new Date(block.startTimeIso),
      new Date(block.endTimeIso),
      block.layout.visibleStart,
      block.layout.visibleEnd,
      locale,
      continuedSegmentLabel,
      userTimeZone,
    );

  return (
    <div
      className="relative min-w-0 flex-1 rounded-lg border border-border bg-card"
      style={{ height: GRID_HEIGHT_PX }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute right-0 left-0 border-t border-border/60"
          style={{ top: hour * HOUR_ROW_PX, height: HOUR_ROW_PX }}
        />
      ))}

      <div
        ref={gridContainerRef}
        className={`relative h-full ${onEmptySlotClick ? "cursor-cell" : ""}`}
        onClick={onEmptySlotClick ? handleGridClick : undefined}
      >
        {blocks.map((block) => {
          const dragAllowed =
            Boolean(enableDrag && calendarDate && onScheduleSaveEnd) &&
            (canDragBlock?.(block) ?? true);

          if (dragAllowed && calendarDate && onScheduleSaveEnd) {
            return (
              <CalendarDraggableBlock
                key={block.id}
                blockId={block.blockId}
                visibleStartIso={block.layout.visibleStart.toISOString()}
                visibleEndIso={block.layout.visibleEnd.toISOString()}
                calendarDate={calendarDate}
                userTimeZone={userTimeZone}
                gridContainerRef={gridContainerRef}
                title={block.title}
                categoryName={block.categoryName}
                color={block.color}
                timeLabel={timeLabel(block)}
                locale={locale}
                status={block.status}
                completionLevel={block.completionLevel}
                completionLabel={completionLabel}
                layout={block.layout}
                isSelected={selectedBlockId === block.blockId}
                compact={compact}
                enableResize={!compact}
                onSelect={onBlockSelect}
                onSaveEnd={onScheduleSaveEnd}
              />
            );
          }

          return (
            <CalendarBlock
              key={block.id}
              title={block.title}
              categoryName={block.categoryName}
              color={block.color}
              timeLabel={timeLabel(block)}
              layout={block.layout}
              blockId={block.blockId}
              locale={locale}
              status={block.status}
              completionLevel={block.completionLevel}
              completionLabel={completionLabel}
              isSelected={selectedBlockId === block.blockId}
              compact={compact}
              dragDisabledHint={
                enableDrag && dragDisabledHint && canDragBlock && !canDragBlock(block)
                  ? dragDisabledHint
                  : undefined
              }
              onSelect={onBlockSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

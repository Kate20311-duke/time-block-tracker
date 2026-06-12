"use client";

import type { CSSProperties } from "react";

import { CalendarBlockCardContent } from "@/components/calendar-block-card";
import type { DayBlockLayout } from "@/lib/calendar";
import { calendarBlockPositionStyle } from "@/lib/calendar-block-style";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  blockId: string;
  title: string;
  categoryName: string;
  color: string;
  timeLabel: string;
  layout: DayBlockLayout;
  locale: Locale;
  status?: string;
  completionLevel?: number;
  completionLabel?: string;
  isSelected?: boolean;
  compact?: boolean;
  dragDisabledHint?: string;
  onSelect: (blockId: string) => void;
};

export function CalendarBlock({
  blockId,
  title,
  categoryName,
  color,
  timeLabel,
  layout,
  locale,
  status,
  completionLevel,
  completionLabel,
  isSelected = false,
  compact = false,
  dragDisabledHint,
  onSelect,
}: Props) {
  const position = calendarBlockPositionStyle(layout);
  const hintSuffix = dragDisabledHint ? ` · ${dragDisabledHint}` : "";

  return (
    <button
      type="button"
      onClick={() => onSelect(blockId)}
      className="absolute overflow-hidden border-0 bg-transparent p-0 text-left"
      style={{
        ...(position as CSSProperties),
        zIndex: isSelected ? 10 : layout.columnIndex + 1,
      }}
      aria-pressed={isSelected}
      aria-label={`${title}, ${categoryName}, ${timeLabel}${hintSuffix}`}
    >
      <CalendarBlockCardContent
        title={title}
        categoryName={categoryName}
        color={color}
        timeLabel={timeLabel}
        locale={locale}
        status={status}
        completionLevel={completionLevel}
        completionLabel={completionLabel}
        compact={compact}
        isSelected={isSelected}
        dragDisabledHint={dragDisabledHint}
        className="h-full"
      />
    </button>
  );
}

"use client";

import type { DayBlockLayout } from "@/lib/calendar";
import { calendarBlockPositionStyle } from "@/lib/calendar-block-style";

type Props = {
  blockId: string;
  title: string;
  categoryName: string;
  color: string;
  timeLabel: string;
  layout: DayBlockLayout;
  isSelected?: boolean;
  compact?: boolean;
  /** Appended to title when block cannot be dragged in week view (e.g. cross-midnight). */
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
      className={`absolute overflow-hidden rounded border text-left text-white shadow-sm transition-shadow hover:brightness-95 ${
        isSelected ? "z-10" : "z-[1]"
      } ${compact ? "px-1 py-0.5" : "px-2 py-1"} ${
        isSelected
          ? "border-zinc-900 ring-2 ring-zinc-900 ring-offset-1"
          : "border-white/25"
      }`}
      style={{
        ...position,
        backgroundColor: color,
      }}
      title={`${title} · ${categoryName} · ${timeLabel}${hintSuffix}`}
      aria-pressed={isSelected}
      aria-label={`${title}, ${categoryName}, ${timeLabel}${hintSuffix}`}
    >
      <p
        className={`truncate font-semibold leading-tight ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {title}
      </p>
      {!compact ? (
        <p className="truncate text-[10px] leading-tight opacity-90">
          {timeLabel}
        </p>
      ) : null}
    </button>
  );
}

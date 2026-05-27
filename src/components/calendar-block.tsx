"use client";

type Props = {
  blockId: string;
  title: string;
  categoryName: string;
  color: string;
  timeLabel: string;
  topPercent: number;
  heightPercent: number;
  isSelected?: boolean;
  compact?: boolean;
  onSelect: (blockId: string) => void;
};

export function CalendarBlock({
  blockId,
  title,
  categoryName,
  color,
  timeLabel,
  topPercent,
  heightPercent,
  isSelected = false,
  compact = false,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(blockId)}
      className={`absolute overflow-hidden rounded border text-left text-white shadow-sm transition-shadow hover:brightness-95 ${
        compact ? "right-0.5 left-0.5 px-1 py-0.5" : "right-1 left-1 px-2 py-1"
      } ${
        isSelected
          ? "z-10 border-zinc-900 ring-2 ring-zinc-900 ring-offset-1"
          : "border-white/25"
      }`}
      style={{
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
        minHeight: "1.25rem",
        backgroundColor: color,
      }}
      title={`${title} · ${categoryName} · ${timeLabel}`}
      aria-pressed={isSelected}
      aria-label={`${title}, ${categoryName}, ${timeLabel}`}
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

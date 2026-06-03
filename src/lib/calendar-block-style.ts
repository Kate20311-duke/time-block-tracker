import type { DayBlockLayout } from "@/lib/calendar";

const COLUMN_GAP_PERCENT = 1;

/** Absolute positioning from day-column layout (overlap columns + time grid). */
export function calendarBlockPositionStyle(
  layout: Pick<
    DayBlockLayout,
    | "topPercent"
    | "heightPercent"
    | "leftPercent"
    | "widthPercent"
    | "columnsInGroup"
    | "columnIndex"
  >,
): {
  top: string;
  height: string;
  left: string;
  width: string;
} {
  const useGap = layout.columnsInGroup > 1;
  const widthPercent =
    layout.widthPercent - (useGap ? COLUMN_GAP_PERCENT : 0);
  const leftPercent =
    layout.leftPercent +
    (layout.columnIndex > 0 && useGap ? COLUMN_GAP_PERCENT / 2 : 0);

  return {
    top: `${layout.topPercent}%`,
    height: `${layout.heightPercent}%`,
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
  };
}

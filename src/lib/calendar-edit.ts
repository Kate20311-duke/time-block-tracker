/** Serializable TimeBlock payload for the calendar edit panel (client). */
export type CalendarEditBlockData = {
  id: string;
  title: string;
  note: string | null;
  reviewNote: string | null;
  categoryId: string;
  status: string;
  completionLevel: number;
  efficiencyLevel: string | null;
  startTimeIso: string;
  endTimeIso: string;
  category: { name: string; color: string };
};

/** Serialize server TimeBlock for the edit panel (dates as ISO strings). */
export function toCalendarEditBlockData(block: {
  id: string;
  title: string;
  note: string | null;
  reviewNote: string | null;
  categoryId: string;
  status: string;
  completionLevel: number;
  efficiencyLevel: string | null;
  startTime: Date;
  endTime: Date;
  category: { name: string; color: string };
}): CalendarEditBlockData {
  return {
    id: block.id,
    title: block.title,
    note: block.note,
    reviewNote: block.reviewNote,
    categoryId: block.categoryId,
    status: block.status,
    completionLevel: block.completionLevel,
    efficiencyLevel: block.efficiencyLevel,
    startTimeIso: block.startTime.toISOString(),
    endTimeIso: block.endTime.toISOString(),
    category: block.category,
  };
}

import type { CalendarEditBlockData } from "@/lib/calendar-edit";

export type CalendarPanelMode = "create" | "edit" | null;

export type CreateDraft = {
  startTimeIso: string;
  endTimeIso: string;
};

/** Which calendar bottom panel is active (create, edit, or none). */
export function resolveCalendarPanelMode(
  createDraft: CreateDraft | null,
  selectedBlockId: string | undefined,
  selectedBlock: CalendarEditBlockData | null,
): CalendarPanelMode {
  if (createDraft) return "create";
  if (selectedBlockId && selectedBlock) return "edit";
  return null;
}

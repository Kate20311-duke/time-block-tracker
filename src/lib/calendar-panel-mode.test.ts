import { describe, expect, it } from "vitest";
import { resolveCalendarPanelMode } from "@/lib/calendar-panel-mode";
import type { CalendarEditBlockData } from "@/lib/calendar-edit";

const sampleBlock: CalendarEditBlockData = {
  id: "block-1",
  title: "Study",
  note: null,
  reviewNote: null,
  categoryId: "cat-1",
  status: "planned",
  completionLevel: 0,
  efficiencyLevel: null,
  startTimeIso: "2026-06-01T13:00:00.000Z",
  endTimeIso: "2026-06-01T14:00:00.000Z",
  category: { name: "Work", color: "#3b82f6" },
};

describe("resolveCalendarPanelMode", () => {
  it("returns create when createDraft is set", () => {
    expect(
      resolveCalendarPanelMode(
        { startTimeIso: "a", endTimeIso: "b" },
        "block-1",
        sampleBlock,
      ),
    ).toBe("create");
  });

  it("returns edit when blockId and selectedBlock are set", () => {
    expect(resolveCalendarPanelMode(null, "block-1", sampleBlock)).toBe("edit");
  });

  it("returns null when nothing is selected", () => {
    expect(resolveCalendarPanelMode(null, undefined, null)).toBe(null);
  });
});

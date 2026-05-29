import { describe, expect, it } from "vitest";
import {
  filterFocusSessionsByStartInRange,
  isFocusSessionCompleted,
  summarizeFocusSessions,
} from "./focus-stats";

const categories = [
  { id: "cat_a", name: "Work", color: "#3b82f6" },
  { id: "cat_b", name: "Study", color: "#22c55e" },
];

describe("isFocusSessionCompleted", () => {
  it("treats completed and converted as completed", () => {
    expect(isFocusSessionCompleted("completed")).toBe(true);
    expect(isFocusSessionCompleted("converted")).toBe(true);
    expect(isFocusSessionCompleted("abandoned")).toBe(false);
  });
});

describe("summarizeFocusSessions", () => {
  const base = {
    categoryId: "cat_a",
    plannedDurationMinutes: 25,
    actualDurationMinutes: 25,
    convertedToTimeBlock: false,
  };

  it("aggregates focus time and completion rate", () => {
    const start = new Date("2026-05-21T10:00:00");
    const end = new Date("2026-05-21T10:25:00");

    const summary = summarizeFocusSessions(
      [
        {
          ...base,
          startTime: start,
          endTime: end,
          status: "completed",
        },
        {
          ...base,
          categoryId: "cat_b",
          startTime: start,
          endTime: end,
          status: "converted",
          convertedToTimeBlock: true,
        },
        {
          ...base,
          startTime: start,
          endTime: end,
          status: "abandoned",
        },
        {
          ...base,
          startTime: start,
          endTime: null,
          status: "running",
        },
      ],
      categories,
    );

    expect(summary.totalFocusMinutes).toBe(50);
    expect(summary.convertedFocusMinutes).toBe(25);
    expect(summary.unconvertedFocusMinutes).toBe(25);
    expect(summary.completedCount).toBe(2);
    expect(summary.abandonedCount).toBe(1);
    expect(summary.convertedCount).toBe(1);
    expect(summary.completionRate).toBeCloseTo(2 / 3);
    expect(summary.categoryBreakdown).toHaveLength(2);
  });

  it("filters by start time range", () => {
    const inRange = filterFocusSessionsByStartInRange(
      [
        {
          ...base,
          startTime: new Date("2026-05-21T10:00:00"),
          endTime: new Date("2026-05-21T10:25:00"),
          status: "completed",
        },
        {
          ...base,
          startTime: new Date("2026-05-22T10:00:00"),
          endTime: new Date("2026-05-22T10:25:00"),
          status: "completed",
        },
      ],
      new Date("2026-05-21T00:00:00"),
      new Date("2026-05-22T00:00:00"),
    );
    expect(inRange).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import {
  canAbandonFocusSession,
  canCompleteFocusSession,
  canConvertFocusSession,
} from "@/lib/actions/focus-shared";
import {
  filterFocusSessionsByStartInRange,
  isFocusSessionCompleted,
  summarizeFocusSessions,
} from "@/lib/focus-stats";
import { durationMinutesSafe, totalRecordedMinutes } from "@/lib/stats";
import { validateFocusSessionCreate } from "@/lib/validation";

const ended = new Date("2026-05-21T10:25:00");
const start = new Date("2026-05-21T10:00:00");

describe("Phase 5 focus flow rules", () => {
  it("allows converting a completed focus session", () => {
    expect(
      canConvertFocusSession({
        status: "completed",
        convertedToTimeBlock: false,
        endTime: ended,
      }),
    ).toBe(true);
  });

  it("does not allow converting an abandoned session", () => {
    expect(
      canConvertFocusSession({
        status: "abandoned",
        convertedToTimeBlock: false,
        endTime: ended,
      }),
    ).toBe(false);
    expect(canCompleteFocusSession("abandoned")).toBe(false);
  });

  it("does not allow converting twice (converted status or flag)", () => {
    expect(
      canConvertFocusSession({
        status: "converted",
        convertedToTimeBlock: true,
        endTime: ended,
      }),
    ).toBe(false);
    expect(
      canConvertFocusSession({
        status: "completed",
        convertedToTimeBlock: true,
        endTime: ended,
      }),
    ).toBe(false);
  });

  it("keeps dashboard focus stats separate from time block totals", () => {
    const focusSessions = [
      {
        startTime: start,
        endTime: ended,
        status: "completed",
        categoryId: "cat_a",
        actualDurationMinutes: 25,
        plannedDurationMinutes: 25,
        convertedToTimeBlock: false,
      },
    ];

    const timeBlocks = [
      {
        startTime: start,
        endTime: ended,
        categoryId: "cat_a",
        status: "completed",
      },
    ];

    const focusSummary = summarizeFocusSessions(focusSessions);
    const blockMinutes = totalRecordedMinutes(timeBlocks);

    expect(focusSummary.totalFocusMinutes).toBe(25);
    expect(blockMinutes).toBe(25);
    expect(focusSummary.completedCount).toBe(1);
    expect(isFocusSessionCompleted("completed")).toBe(true);

    const inWeek = filterFocusSessionsByStartInRange(
      focusSessions,
      new Date("2026-05-21T00:00:00"),
      new Date("2026-05-22T00:00:00"),
    );
    expect(summarizeFocusSessions(inWeek).totalFocusMinutes).toBe(25);
    expect(durationMinutesSafe(start, ended)).toBe(25);
  });

  it("rejects invalid planned duration on create validation", () => {
    expect(
      validateFocusSessionCreate({
        categoryId: "cat_a",
        plannedDurationMinutes: 0,
        startTime: start,
      }),
    ).toBe("invalid_planned_duration");

    expect(
      validateFocusSessionCreate({
        categoryId: "cat_a",
        plannedDurationMinutes: -10,
        startTime: start,
      }),
    ).toBe("invalid_planned_duration");
  });

  it("abandon is only allowed while planned or running", () => {
    expect(canAbandonFocusSession("running")).toBe(true);
    expect(canAbandonFocusSession("completed")).toBe(false);
    expect(canAbandonFocusSession("converted")).toBe(false);
  });
});

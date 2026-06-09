import { describe, expect, it } from "vitest";
import {
  clampCompletionLevel,
  completionLevelFromStatus,
  getValidTimeBlockRange,
  isNonEmptyTrimmed,
  isValidFocusSessionStatus,
  isValidTimeBlockStatus,
  validateFocusSessionCreate,
  validateFocusSessionPlannedDuration,
  validateTimeBlockCreate,
} from "./validation";

describe("isNonEmptyTrimmed", () => {
  it("accepts non-empty trimmed strings", () => {
    expect(isNonEmptyTrimmed("工作")).toBe(true);
    expect(isNonEmptyTrimmed("  focus  ")).toBe(true);
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(isNonEmptyTrimmed("")).toBe(false);
    expect(isNonEmptyTrimmed("   ")).toBe(false);
  });
});

describe("clampCompletionLevel", () => {
  it("clamps values to 0–100 and rounds", () => {
    expect(clampCompletionLevel(50.4)).toBe(50);
    expect(clampCompletionLevel(-10)).toBe(0);
    expect(clampCompletionLevel(150)).toBe(100);
  });
});

describe("getValidTimeBlockRange", () => {
  it("returns range when end is after start", () => {
    const start = new Date("2026-05-21T10:00:00");
    const end = new Date("2026-05-21T11:00:00");
    expect(getValidTimeBlockRange(start, end)).toEqual({ start, end });
  });

  it("returns null for invalid ranges", () => {
    const start = new Date("2026-05-21T10:00:00");
    expect(getValidTimeBlockRange(start, start)).toBeNull();
    expect(getValidTimeBlockRange(start, null)).toBeNull();
  });
});

describe("isValidTimeBlockStatus", () => {
  it("accepts known statuses", () => {
    expect(isValidTimeBlockStatus("planned")).toBe(true);
    expect(isValidTimeBlockStatus("completed")).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(isValidTimeBlockStatus("cancelled")).toBe(false);
  });
});

describe("completionLevelFromStatus", () => {
  it("maps status to hidden UX defaults", () => {
    expect(completionLevelFromStatus("completed")).toBe(100);
    expect(completionLevelFromStatus("partial")).toBe(100);
    expect(completionLevelFromStatus("planned")).toBe(0);
    expect(completionLevelFromStatus("skipped")).toBe(0);
  });
});

describe("validateTimeBlockCreate", () => {
  const start = new Date("2026-05-21T10:00:00");
  const end = new Date("2026-05-21T11:00:00");

  it("returns null for valid input", () => {
    expect(
      validateTimeBlockCreate({
        title: "Focus",
        categoryId: "cat_1",
        startTime: start,
        endTime: end,
        status: "planned",
        completionLevel: 50,
      }),
    ).toBeNull();
  });

  it("rejects invalid range and completion level", () => {
    expect(
      validateTimeBlockCreate({
        title: "Focus",
        categoryId: "cat_1",
        startTime: start,
        endTime: start,
        status: "planned",
        completionLevel: 50,
      }),
    ).toBe("invalid_range");

    expect(
      validateTimeBlockCreate({
        title: "Focus",
        categoryId: "cat_1",
        startTime: start,
        endTime: end,
        status: "planned",
        completionLevel: 101,
      }),
    ).toBe("invalid_completion");
  });
});

describe("validateFocusSessionPlannedDuration", () => {
  it("accepts positive integers", () => {
    expect(validateFocusSessionPlannedDuration(25)).toBeNull();
  });

  it("rejects zero or negative values", () => {
    expect(validateFocusSessionPlannedDuration(0)).toBe(
      "invalid_planned_duration",
    );
    expect(validateFocusSessionPlannedDuration(-5)).toBe(
      "invalid_planned_duration",
    );
  });
});

describe("validateFocusSessionCreate", () => {
  const start = new Date("2026-05-21T10:00:00");
  const end = new Date("2026-05-21T10:25:00");

  it("accepts valid create input", () => {
    expect(
      validateFocusSessionCreate({
        categoryId: "cat_1",
        plannedDurationMinutes: 25,
        startTime: start,
      }),
    ).toBeNull();
  });

  it("rejects invalid category and range", () => {
    expect(
      validateFocusSessionCreate({
        categoryId: "",
        plannedDurationMinutes: 25,
        startTime: start,
      }),
    ).toBe("invalid_category");

    expect(
      validateFocusSessionCreate({
        categoryId: "cat_1",
        plannedDurationMinutes: 25,
        startTime: start,
        endTime: end,
      }),
    ).toBeNull();

    expect(
      validateFocusSessionCreate({
        categoryId: "cat_1",
        plannedDurationMinutes: 25,
        startTime: start,
        endTime: start,
      }),
    ).toBe("invalid_range");
  });
});

describe("isValidFocusSessionStatus", () => {
  it("accepts known statuses", () => {
    expect(isValidFocusSessionStatus("running")).toBe(true);
    expect(isValidFocusSessionStatus("converted")).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(isValidFocusSessionStatus("paused")).toBe(false);
  });
});

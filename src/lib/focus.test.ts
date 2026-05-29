import { describe, expect, it } from "vitest";
import {
  focusSessionDisplayMinutes,
  formatFocusCountdown,
  parsePlannedFocusMinutes,
} from "./focus";

describe("formatFocusCountdown", () => {
  it("formats minutes and seconds", () => {
    expect(formatFocusCountdown(25 * 60)).toBe("25:00");
    expect(formatFocusCountdown(90)).toBe("1:30");
  });

  it("formats hours when needed", () => {
    expect(formatFocusCountdown(3661)).toBe("1:01:01");
  });

  it("never shows negative values", () => {
    expect(formatFocusCountdown(-5)).toBe("0:00");
  });
});

describe("focusSessionDisplayMinutes", () => {
  it("prefers actual duration when set", () => {
    expect(
      focusSessionDisplayMinutes({
        actualDurationMinutes: 22,
        plannedDurationMinutes: 25,
        startTime: new Date("2026-05-21T10:00:00"),
        endTime: new Date("2026-05-21T10:30:00"),
      }),
    ).toBe(22);
  });

  it("computes from start and end when actual is missing", () => {
    expect(
      focusSessionDisplayMinutes({
        actualDurationMinutes: null,
        plannedDurationMinutes: 25,
        startTime: new Date("2026-05-21T10:00:00"),
        endTime: new Date("2026-05-21T10:25:00"),
      }),
    ).toBe(25);
  });
});

describe("parsePlannedFocusMinutes", () => {
  it("accepts positive integers", () => {
    expect(parsePlannedFocusMinutes("25")).toBe(25);
  });

  it("rejects invalid values", () => {
    expect(parsePlannedFocusMinutes("0")).toBeNull();
    expect(parsePlannedFocusMinutes("")).toBeNull();
    expect(parsePlannedFocusMinutes("abc")).toBeNull();
  });
});

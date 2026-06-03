import { describe, expect, it } from "vitest";
import {
  durationMinutes,
  formatDateTime,
  formatDurationMinutes,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from "./time";

describe("durationMinutes", () => {
  it("returns minutes between start and end", () => {
    const start = new Date("2026-05-21T10:00:00");
    const end = new Date("2026-05-21T11:30:00");
    expect(durationMinutes(start, end)).toBe(90);
  });

  it("returns 0 when end is before start", () => {
    const start = new Date("2026-05-21T12:00:00");
    const end = new Date("2026-05-21T10:00:00");
    expect(durationMinutes(start, end)).toBe(0);
  });
});

/** Deprecated utility — not used by Server Actions after TZ-2 hardening. */
describe("parseDateTimeLocal", () => {
  it("parses a valid datetime-local value", () => {
    const date = parseDateTimeLocal("2026-05-21T14:30");
    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
  });

  it("returns null for empty or invalid input", () => {
    expect(parseDateTimeLocal("")).toBeNull();
    expect(parseDateTimeLocal("not-a-date")).toBeNull();
  });
});

describe("toDateTimeLocalValue", () => {
  it("formats date for datetime-local inputs", () => {
    const value = toDateTimeLocalValue(new Date(2026, 4, 21, 9, 5));
    expect(value).toBe("2026-05-21T09:05");
  });
});

describe("formatDateTime", () => {
  it("returns a non-empty localized string", () => {
    const text = formatDateTime(new Date("2026-05-21T10:00:00"));
    expect(text.length).toBeGreaterThan(0);
  });
});

describe("formatDurationMinutes", () => {
  it("formats minutes without labeling them as hours", () => {
    expect(formatDurationMinutes(85, "zh")).toBe("1 小时 25 分钟");
    expect(formatDurationMinutes(85, "en")).toBe("1h 25min");
    expect(formatDurationMinutes(60, "zh")).toBe("1 小时");
    expect(formatDurationMinutes(45, "zh")).toBe("45 分钟");
  });

  it("never displays raw minutes as hours", () => {
    expect(formatDurationMinutes(85, "zh")).not.toContain("85 小时");
  });
});

import { describe, expect, it } from "vitest";
import {
  durationMinutes,
  formatDateTime,
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

import { describe, expect, it } from "vitest";
import {
  instantToDatetimeLocalValue,
  isDatetimeLocalValue,
  parseUtcIsoString,
  wallTimeInTimeZoneToUtcIso,
} from "./datetime-local-iso";

describe("wallTimeInTimeZoneToUtcIso", () => {
  it("maps 09:00 America/New_York on 2026-06-01 to 13:00 UTC (EDT)", () => {
    const iso = wallTimeInTimeZoneToUtcIso(
      "2026-06-01",
      9,
      0,
      "America/New_York",
    );
    expect(iso).toBe("2026-06-01T13:00:00.000Z");
  });

  it("maps 09:00 Asia/Shanghai on 2026-06-01 to 01:00 UTC", () => {
    const iso = wallTimeInTimeZoneToUtcIso(
      "2026-06-01",
      9,
      0,
      "Asia/Shanghai",
    );
    expect(iso).toBe("2026-06-01T01:00:00.000Z");
  });
});

describe("instantToDatetimeLocalValue", () => {
  it("formats UTC instant for New York wall clock", () => {
    expect(
      instantToDatetimeLocalValue(
        "2026-06-01T13:00:00.000Z",
        "America/New_York",
      ),
    ).toBe("2026-06-01T09:00");
  });

  it("formats UTC instant for Shanghai wall clock", () => {
    expect(
      instantToDatetimeLocalValue("2026-06-01T01:00:00.000Z", "Asia/Shanghai"),
    ).toBe("2026-06-01T09:00");
  });
});

describe("parseUtcIsoString", () => {
  it("parses valid ISO strings", () => {
    const date = parseUtcIsoString("2026-06-01T13:00:00.000Z");
    expect(date?.toISOString()).toBe("2026-06-01T13:00:00.000Z");
  });

  it("returns null for invalid input", () => {
    expect(parseUtcIsoString("")).toBeNull();
    expect(parseUtcIsoString("not-iso")).toBeNull();
  });
});

describe("isDatetimeLocalValue", () => {
  it("accepts YYYY-MM-DDTHH:mm", () => {
    expect(isDatetimeLocalValue("2026-06-01T09:00")).toBe(true);
    expect(isDatetimeLocalValue("2026-06-01T9:00")).toBe(false);
  });
});

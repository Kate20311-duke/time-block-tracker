import { describe, expect, it } from "vitest";

import {
  buildTimeBlockOverlapWhere,
  defaultExportMonthRange,
  parseExportDateRange,
} from "@/lib/export/time-block-query";

describe("defaultExportMonthRange", () => {
  it("returns first and last day of the month in timezone", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    expect(defaultExportMonthRange("UTC", now)).toEqual({
      fromParam: "2026-06-01",
      toParam: "2026-06-30",
    });
  });
});

describe("parseExportDateRange", () => {
  const timeZone = "UTC";

  it("defaults to current month when params omitted", () => {
    const result = parseExportDateRange(
      null,
      null,
      timeZone,
      new Date("2026-03-10T00:00:00.000Z"),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.range.fromParam).toBe("2026-03-01");
      expect(result.range.toParam).toBe("2026-03-31");
    }
  });

  it("parses explicit from and to", () => {
    const result = parseExportDateRange(
      "2026-05-01",
      "2026-05-07",
      timeZone,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.range.fromParam).toBe("2026-05-01");
      expect(result.range.toParam).toBe("2026-05-07");
      expect(result.range.rangeEnd.getTime()).toBeGreaterThan(
        result.range.rangeStart.getTime(),
      );
    }
  });

  it("rejects invalid from date", () => {
    const result = parseExportDateRange("2026-13-40", "2026-05-07", timeZone);
    expect(result).toEqual({ ok: false, error: "invalid_from" });
  });

  it("rejects when to is before from", () => {
    const result = parseExportDateRange(
      "2026-05-10",
      "2026-05-01",
      timeZone,
    );
    expect(result).toEqual({ ok: false, error: "invalid_range" });
  });
});

describe("buildTimeBlockOverlapWhere", () => {
  it("matches dashboard overlap semantics", () => {
    const rangeStart = new Date("2026-05-01T00:00:00.000Z");
    const rangeEnd = new Date("2026-05-08T00:00:00.000Z");
    expect(buildTimeBlockOverlapWhere(rangeStart, rangeEnd)).toEqual({
      startTime: { lt: rangeEnd },
      endTime: { gt: rangeStart },
    });
  });
});

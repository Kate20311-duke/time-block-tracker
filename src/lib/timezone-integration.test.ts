/**
 * TZ-5: End-to-end timezone model checks (deterministic IANA, no host TZ).
 */
import { describe, expect, it } from "vitest";
import {
  datetimeLocalValueToUtcIso,
  wallTimeInTimeZoneToUtcIso,
} from "@/lib/datetime-local-iso";
import {
  formatCalendarDateParam,
  getDayQueryRange,
  getWeekQueryRange,
  parseCalendarDateParam,
} from "@/lib/calendar";
import {
  buildCalendarRedirectPath,
  parseTimeBlockScheduleFromForm,
} from "@/lib/actions/time-block-shared";
import { getDashboardDateRanges } from "@/lib/dashboard-ranges";
import {
  clippedDurationMinutesInRange,
  totalRecordedMinutesInRange,
} from "@/lib/stats";

const NY = "America/New_York";
const SHANGHAI = "Asia/Shanghai";
const FIXED_NOW = new Date("2026-06-01T13:30:00.000Z");

describe("TZ-5 — 09:00 local maps to different UTC instants", () => {
  it("New York vs Shanghai", () => {
    const ny = wallTimeInTimeZoneToUtcIso("2026-06-01", 9, 0, NY);
    const sh = wallTimeInTimeZoneToUtcIso("2026-06-01", 9, 0, SHANGHAI);
    expect(ny).toBe("2026-06-01T13:00:00.000Z");
    expect(sh).toBe("2026-06-01T01:00:00.000Z");
    expect(ny).not.toBe(sh);
  });
});

describe("TZ-5 — getDayQueryRange", () => {
  it("America/New_York", () => {
    const { dayStart, dayEnd } = getDayQueryRange("2026-06-01", NY);
    expect(dayStart.toISOString()).toBe("2026-06-01T04:00:00.000Z");
    expect(dayEnd.toISOString()).toBe("2026-06-02T04:00:00.000Z");
  });

  it("Asia/Shanghai", () => {
    const { dayStart, dayEnd } = getDayQueryRange("2026-06-01", SHANGHAI);
    expect(dayStart.toISOString()).toBe("2026-05-31T16:00:00.000Z");
    expect(dayEnd.toISOString()).toBe("2026-06-01T16:00:00.000Z");
  });
});

describe("TZ-5 — getWeekQueryRange", () => {
  it("America/New_York week containing 2026-06-01 (Monday anchor)", () => {
    const anchor = parseCalendarDateParam("2026-06-01", NY);
    const { weekStart, weekEnd } = getWeekQueryRange(anchor, NY);
    expect(weekStart.toISOString()).toBe("2026-06-01T04:00:00.000Z");
    expect(weekEnd.toISOString()).toBe("2026-06-08T04:00:00.000Z");
  });

  it("Asia/Shanghai week containing 2026-06-01", () => {
    const anchor = parseCalendarDateParam("2026-06-01", SHANGHAI);
    const { weekStart, weekEnd } = getWeekQueryRange(anchor, SHANGHAI);
    expect(weekStart.toISOString()).toBe("2026-05-31T16:00:00.000Z");
    expect(weekEnd.toISOString()).toBe("2026-06-07T16:00:00.000Z");
  });
});

describe("TZ-5 — cross-midnight 22:00–04:00", () => {
  const cross = {
    startTime: new Date(
      wallTimeInTimeZoneToUtcIso("2026-06-01", 22, 0, NY),
    ),
    endTime: new Date(wallTimeInTimeZoneToUtcIso("2026-06-02", 4, 0, NY)),
    categoryId: "cat",
    status: "completed",
  };

  it("splits across local days", () => {
    const d1 = getDayQueryRange("2026-06-01", NY);
    const d2 = getDayQueryRange("2026-06-02", NY);
    expect(
      clippedDurationMinutesInRange(
        cross.startTime,
        cross.endTime,
        d1.dayStart,
        d1.dayEnd,
      ),
    ).toBe(120);
    expect(
      clippedDurationMinutesInRange(
        cross.startTime,
        cross.endTime,
        d2.dayStart,
        d2.dayEnd,
      ),
    ).toBe(240);
  });

  it("dashboard today total uses clipped minutes only", () => {
    const dash = getDashboardDateRanges(FIXED_NOW, NY);
    const today = getDayQueryRange("2026-06-01", NY);
    expect(
      totalRecordedMinutesInRange([cross], today.dayStart, today.dayEnd),
    ).toBe(120);
    expect(dash.todayStart.toISOString()).toBe(today.dayStart.toISOString());
  });
});

describe("TZ-5 — Review/day matches Calendar day bounds", () => {
  it("parseCalendarDateParam + getDayQueryRange equals direct date param", () => {
    const fromReview = getDayQueryRange(
      parseCalendarDateParam("2026-06-01", NY),
      NY,
    );
    const fromCalendar = getDayQueryRange("2026-06-01", NY);
    expect(fromReview.dayStart.toISOString()).toBe(
      fromCalendar.dayStart.toISOString(),
    );
    expect(fromReview.dayEnd.toISOString()).toBe(fromCalendar.dayEnd.toISOString());
  });
});

describe("TZ-5 — calendar redirect near UTC midnight", () => {
  const instant = new Date("2026-06-01T03:00:00.000Z");

  it("formatCalendarDateParam differs by timezone", () => {
    expect(formatCalendarDateParam(instant, NY)).toBe("2026-05-31");
    expect(formatCalendarDateParam(instant, SHANGHAI)).toBe("2026-06-01");
  });

  it("buildCalendarRedirectPath preserves explicit YYYY-MM-DD from calendar", () => {
    const formData = new FormData();
    formData.set("calendarDate", "2026-05-31");
    expect(buildCalendarRedirectPath(formData, undefined, NY)).toContain(
      "date=2026-05-31",
    );
  });
});

describe("TZ-5 — server host TZ independence (IANA-only ranges)", () => {
  it("getDashboardDateRanges is stable for fixed UTC now and explicit IANA", () => {
    const a = getDashboardDateRanges(FIXED_NOW, NY);
    const b = getDashboardDateRanges(FIXED_NOW, NY);
    expect(a.todayStart.toISOString()).toBe(b.todayStart.toISOString());
    expect(a.weekEnd.toISOString()).toBe(b.weekEnd.toISOString());
    expect(a.todayStart.toISOString()).toBe("2026-06-01T04:00:00.000Z");
  });
});

describe("TZ-5 — TZ-2 server rejects timezone-less form times", () => {
  it("returns null schedule when only datetime-local fields are sent", () => {
    const formData = new FormData();
    formData.set("startTime", "2026-06-01T09:00");
    formData.set("endTime", "2026-06-01T10:00");
    const { startTime, endTime } = parseTimeBlockScheduleFromForm(formData);
    expect(startTime).toBeNull();
    expect(endTime).toBeNull();
  });
});

describe("TZ-5 — datetime-local wire format", () => {
  it("datetimeLocalValueToUtcIso accepts YYYY-MM-DDTHH:mm", () => {
    const iso = datetimeLocalValueToUtcIso("2026-06-01T09:00");
    expect(iso).not.toBeNull();
    expect(iso).toMatch(/Z$/);
  });
});

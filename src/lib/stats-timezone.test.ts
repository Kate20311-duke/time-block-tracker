import { describe, expect, it } from "vitest";
import { wallTimeInTimeZoneToUtcIso } from "@/lib/datetime-local-iso";
import { getDayQueryRange } from "@/lib/calendar";
import {
  dailyStartTotalsForSelectedWeek,
  dailyTotalsForSelectedWeek,
  totalRecordedMinutesInRange,
} from "@/lib/stats";
import { startOfWeekMonday } from "@/lib/calendar";

const NY = "America/New_York";

function block(
  startIso: string,
  endIso: string,
  categoryId = "cat1",
): {
  startTime: Date;
  endTime: Date;
  categoryId: string;
  status: string;
} {
  return {
    startTime: new Date(startIso),
    endTime: new Date(endIso),
    categoryId,
    status: "completed",
  };
}

describe("totalRecordedMinutesInRange (TZ-4)", () => {
  it("clips cross-midnight block per local day", () => {
    const cross = block(
      wallTimeInTimeZoneToUtcIso("2026-06-01", 22, 0, NY),
      wallTimeInTimeZoneToUtcIso("2026-06-02", 4, 0, NY),
    );

    const day1 = getDayQueryRange("2026-06-01", NY);
    const day2 = getDayQueryRange("2026-06-02", NY);

    expect(
      totalRecordedMinutesInRange([cross], day1.dayStart, day1.dayEnd),
    ).toBe(120);
    expect(
      totalRecordedMinutesInRange([cross], day2.dayStart, day2.dayEnd),
    ).toBe(240);
    expect(
      totalRecordedMinutesInRange([cross], day1.dayStart, day1.dayEnd) +
        totalRecordedMinutesInRange([cross], day2.dayStart, day2.dayEnd),
    ).toBe(360);
  });
});

describe("dailyTotalsForSelectedWeek (TZ-4)", () => {
  it("does not double-count cross-midnight minutes across days", () => {
    const cross = block(
      wallTimeInTimeZoneToUtcIso("2026-06-01", 22, 0, NY),
      wallTimeInTimeZoneToUtcIso("2026-06-02", 4, 0, NY),
    );
    const weekStart = startOfWeekMonday(
      new Date(wallTimeInTimeZoneToUtcIso("2026-06-01", 12, 0, NY)),
      NY,
    );
    const totals = dailyTotalsForSelectedWeek([cross], weekStart, NY);
    const june1 = totals.find(
      (d) =>
        d.dayStart.toISOString() ===
        getDayQueryRange("2026-06-01", NY).dayStart.toISOString(),
    );
    const june2 = totals.find(
      (d) =>
        d.dayStart.toISOString() ===
        getDayQueryRange("2026-06-02", NY).dayStart.toISOString(),
    );
    expect(june1?.totalMinutes).toBe(120);
    expect(june2?.totalMinutes).toBe(240);
  });
});

describe("dailyStartTotalsForSelectedWeek local date (TZ-4)", () => {
  it("groups by local start date in user timezone", () => {
    const nineAm = block(
      wallTimeInTimeZoneToUtcIso("2026-06-01", 9, 0, NY),
      wallTimeInTimeZoneToUtcIso("2026-06-01", 10, 0, NY),
    );
    const weekStart = startOfWeekMonday(
      new Date(wallTimeInTimeZoneToUtcIso("2026-06-01", 12, 0, NY)),
      NY,
    );
    const totals = dailyStartTotalsForSelectedWeek([nineAm], weekStart, NY);
    const june1 = totals.find(
      (d) =>
        d.dayStart.toISOString() ===
        getDayQueryRange("2026-06-01", NY).dayStart.toISOString(),
    );
    expect(june1?.totalMinutes).toBe(60);
  });
});

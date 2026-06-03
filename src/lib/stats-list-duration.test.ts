import { describe, expect, it } from "vitest";
import { wallTimeInTimeZoneToUtcIso } from "@/lib/datetime-local-iso";
import { getDayQueryRange } from "@/lib/calendar";
import {
  clipBlocksToRange,
  clippedDurationMinutesInRange,
  formatBlockDurationInRange,
  summarizeCompletionQuality,
  totalRecordedMinutesInRange,
} from "@/lib/stats";

const NY = "America/New_York";

describe("clipped list duration (TZ-4.5)", () => {
  const cross = {
    startTime: new Date(
      wallTimeInTimeZoneToUtcIso("2026-06-01", 22, 0, NY),
    ),
    endTime: new Date(wallTimeInTimeZoneToUtcIso("2026-06-02", 4, 0, NY)),
    categoryId: "cat1",
    status: "completed" as const,
  };

  const day1 = getDayQueryRange("2026-06-01", NY);
  const day2 = getDayQueryRange("2026-06-02", NY);

  it("attributes 2h to start day and 4h to next day", () => {
    expect(
      clippedDurationMinutesInRange(
        cross.startTime,
        cross.endTime,
        day1.dayStart,
        day1.dayEnd,
      ),
    ).toBe(120);
    expect(
      clippedDurationMinutesInRange(
        cross.startTime,
        cross.endTime,
        day2.dayStart,
        day2.dayEnd,
      ),
    ).toBe(240);
  });

  it("formatBlockDurationInRange shows clipped and total when they differ", () => {
    const label = formatBlockDurationInRange(
      cross.startTime,
      cross.endTime,
      day2.dayStart,
      day2.dayEnd,
      "en",
      "day",
    );
    expect(label).toContain("4h");
    expect(label).toContain("6h");
    expect(label).toContain("total");
  });

  it("review/day summary planned minutes equals sum of clipped list durations", () => {
    const blocksInDay = clipBlocksToRange([cross], day1.dayStart, day1.dayEnd);
    const summary = summarizeCompletionQuality(blocksInDay);
    const listSum = blocksInDay.reduce(
      (sum, b) =>
        sum +
        clippedDurationMinutesInRange(
          b.startTime,
          b.endTime,
          day1.dayStart,
          day1.dayEnd,
        ),
      0,
    );
    expect(summary.totalPlannedMinutes).toBe(listSum);
    expect(summary.totalPlannedMinutes).toBe(
      totalRecordedMinutesInRange([cross], day1.dayStart, day1.dayEnd),
    );
  });
});

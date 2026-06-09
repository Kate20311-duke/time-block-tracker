import { describe, expect, it } from "vitest";
import {
  CALENDAR_CREATE_DEFAULT_DURATION_MINUTES,
  slotTimesFromGridClick,
} from "@/lib/calendar-slot-create";
import { CALENDAR_GRID_HEIGHT_PX } from "@/lib/calendar";
import { wallTimeInTimeZoneToUtcIso } from "@/lib/datetime-local-iso";

const NY = "America/New_York";

describe("slotTimesFromGridClick", () => {
  it("snaps click to 5 minutes and adds default duration", () => {
    const y = (9 * 60 + 2) / (24 * 60) * CALENDAR_GRID_HEIGHT_PX;
    const slot = slotTimesFromGridClick(
      "2026-06-01",
      y,
      CALENDAR_GRID_HEIGHT_PX,
      NY,
    );

    expect(slot).not.toBeNull();
    expect(slot!.startTimeIso).toBe(
      wallTimeInTimeZoneToUtcIso("2026-06-01", 9, 0, NY),
    );
    expect(slot!.endTimeIso).toBe(
      wallTimeInTimeZoneToUtcIso(
        "2026-06-01",
        9,
        CALENDAR_CREATE_DEFAULT_DURATION_MINUTES,
        NY,
      ),
    );
  });

  it("returns null when default duration would exceed the day", () => {
    const y = CALENDAR_GRID_HEIGHT_PX - 1;
    const slot = slotTimesFromGridClick(
      "2026-06-01",
      y,
      CALENDAR_GRID_HEIGHT_PX,
      NY,
    );
    expect(slot).toBeNull();
  });
});

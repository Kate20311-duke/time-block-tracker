import { describe, expect, it } from "vitest";

import {
  getTomorrowCalendarUrl,
  mergeCreatedBlocksIntoExisting,
} from "@/lib/assistant/tomorrow-plan-ui";

describe("tomorrow-plan-ui helpers", () => {
  it("merges created blocks into existing and sorts by start time", () => {
    const merged = mergeCreatedBlocksIntoExisting(
      [
        {
          id: "existing-1",
          title: "Morning",
          categoryId: "cat-1",
          categoryName: "Work",
          startTime: "2026-06-11T01:00:00.000Z",
          endTime: "2026-06-11T02:00:00.000Z",
        },
      ],
      [
        {
          id: "created-1",
          title: "Evening",
          categoryId: "cat-1",
          startTime: "2026-06-11T10:00:00.000Z",
          endTime: "2026-06-11T11:00:00.000Z",
        },
      ],
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]?.id).toBe("existing-1");
    expect(merged[1]?.id).toBe("created-1");
    expect(merged[1]?.categoryName).toBeNull();
  });

  it("falls back to calendar date query when calendarUrl is missing", () => {
    expect(getTomorrowCalendarUrl("2026-06-11")).toBe(
      "/calendar?date=2026-06-11",
    );
    expect(getTomorrowCalendarUrl("2026-06-11", "/calendar?date=2026-06-11")).toBe(
      "/calendar?date=2026-06-11",
    );
  });
});

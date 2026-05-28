import { describe, expect, it } from "vitest";
import {
  buildCalendarRedirectPath,
  parseScheduleInput,
  validateFullTimeBlockForm,
  validateScheduleTimes,
} from "./time-block-shared";

describe("validateScheduleTimes", () => {
  it("accepts a valid range", () => {
    const start = new Date("2026-05-21T10:00:00");
    const end = new Date("2026-05-21T11:00:00");
    expect(validateScheduleTimes(start, end)).toBeNull();
  });

  it("rejects invalid or equal times", () => {
    const start = new Date("2026-05-21T10:00:00");
    expect(validateScheduleTimes(start, start)).toBe("invalid_range");
    expect(validateScheduleTimes(start, new Date("invalid"))).toBe(
      "missing_fields",
    );
  });
});

describe("parseScheduleInput", () => {
  it("parses ISO strings", () => {
    const parsed = parseScheduleInput({
      id: "block_1",
      startTime: "2026-05-21T10:00:00.000Z",
      endTime: "2026-05-21T11:00:00.000Z",
    });
    expect(parsed.id).toBe("block_1");
    expect(parsed.startTime).toBeInstanceOf(Date);
    expect(parsed.endTime.getTime()).toBeGreaterThan(parsed.startTime.getTime());
  });
});

describe("buildCalendarRedirectPath", () => {
  it("preserves calendar query params from form", () => {
    const formData = new FormData();
    formData.set("calendarDate", "2026-05-21");
    formData.set("calendarView", "day");
    formData.set("calendarBlockId", "abc123");

    expect(buildCalendarRedirectPath(formData)).toBe(
      "/calendar?date=2026-05-21&view=day&blockId=abc123",
    );
  });

  it("appends success and error params", () => {
    const formData = new FormData();
    formData.set("calendarDate", "2026-05-21");

    expect(
      buildCalendarRedirectPath(formData, { success: "updated" }),
    ).toBe("/calendar?date=2026-05-21&success=updated");

    expect(
      buildCalendarRedirectPath(formData, { error: "invalid_range" }),
    ).toBe("/calendar?date=2026-05-21&error=invalid_range");
  });

  it("preserves week view and blockId on success redirect", () => {
    const formData = new FormData();
    formData.set("calendarDate", "2026-05-21");
    formData.set("calendarView", "week");
    formData.set("calendarBlockId", "block_abc");

    expect(
      buildCalendarRedirectPath(formData, { success: "updated" }),
    ).toBe("/calendar?date=2026-05-21&blockId=block_abc&success=updated");
  });
});

describe("validateFullTimeBlockForm", () => {
  it("delegates to full field validation", () => {
    const result = validateFullTimeBlockForm({
      id: "id1",
      title: "Focus",
      note: null,
      reviewNote: null,
      categoryId: "cat1",
      status: "planned",
      completionLevel: 0,
      efficiencyLevel: null,
      startTime: new Date("2026-05-21T10:00:00"),
      endTime: new Date("2026-05-21T11:00:00"),
    });
    expect(result.error).toBeNull();
    expect(result.range).not.toBeNull();
  });
});

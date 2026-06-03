import { describe, expect, it } from "vitest";
import {
  buildCalendarRedirectPath,
  parseScheduleInput,
  parseTimeBlockFormData,
  parseTimeBlockScheduleFromForm,
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

  it("keeps YYYY-MM-DD calendarDate as-is for user timezone (no re-parse)", () => {
    const formData = new FormData();
    formData.set("calendarDate", "2026-06-01");
    expect(buildCalendarRedirectPath(formData, undefined, "America/New_York")).toBe(
      "/calendar?date=2026-06-01",
    );
    expect(buildCalendarRedirectPath(formData, undefined, "Asia/Shanghai")).toBe(
      "/calendar?date=2026-06-01",
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

describe("parseTimeBlockScheduleFromForm", () => {
  it("prefers startTimeIso and endTimeIso over datetime-local fields", () => {
    const formData = new FormData();
    formData.set("startTimeIso", "2026-06-01T13:00:00.000Z");
    formData.set("endTimeIso", "2026-06-01T14:00:00.000Z");
    formData.set("startTime", "2026-06-01T09:00");
    formData.set("endTime", "2026-06-01T10:00");

    const { startTime, endTime } = parseTimeBlockScheduleFromForm(formData);
    expect(startTime?.toISOString()).toBe("2026-06-01T13:00:00.000Z");
    expect(endTime?.toISOString()).toBe("2026-06-01T14:00:00.000Z");
  });

  it("returns null when ISO fields are missing (no datetime-local fallback)", () => {
    const formData = new FormData();
    formData.set("startTime", "2026-05-21T10:00");
    formData.set("endTime", "2026-05-21T11:00");

    const { startTime, endTime } = parseTimeBlockScheduleFromForm(formData);
    expect(startTime).toBeNull();
    expect(endTime).toBeNull();
  });

  it("returns null when ISO fields are invalid", () => {
    const formData = new FormData();
    formData.set("startTimeIso", "not-iso");
    formData.set("endTimeIso", "2026-06-01T14:00:00.000Z");

    const { startTime, endTime } = parseTimeBlockScheduleFromForm(formData);
    expect(startTime).toBeNull();
    expect(endTime).toBeNull();
  });

  it("returns null when only one ISO field is present", () => {
    const formData = new FormData();
    formData.set("startTimeIso", "2026-06-01T13:00:00.000Z");

    const { startTime, endTime } = parseTimeBlockScheduleFromForm(formData);
    expect(startTime).toBeNull();
    expect(endTime).toBeNull();
  });
});

describe("parseTimeBlockScheduleFromForm validation chain", () => {
  it("yields missing_fields via validateFullTimeBlockForm when ISO is absent", () => {
    const formData = new FormData();
    formData.set("title", "Focus");
    formData.set("categoryId", "cat1");
    formData.set("startTime", "2026-05-21T10:00");
    formData.set("endTime", "2026-05-21T11:00");

    const data = parseTimeBlockFormData(formData);
    const result = validateFullTimeBlockForm(data);
    expect(result.error).toBe("missing_fields");
    expect(result.range).toBeNull();
  });
});

describe("parseTimeBlockFormData", () => {
  it("reads schedule from ISO hidden fields", () => {
    const formData = new FormData();
    formData.set("title", "Focus");
    formData.set("categoryId", "cat1");
    formData.set("startTimeIso", "2026-06-01T01:00:00.000Z");
    formData.set("endTimeIso", "2026-06-01T02:00:00.000Z");

    const data = parseTimeBlockFormData(formData);
    expect(data.startTime?.toISOString()).toBe("2026-06-01T01:00:00.000Z");
    expect(data.endTime?.toISOString()).toBe("2026-06-01T02:00:00.000Z");
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

import { describe, expect, it } from "vitest";
import {
  buildFocusSessionEndUpdate,
  canConvertFocusSession,
  DEFAULT_FOCUS_TIME_BLOCK_TITLE,
  defaultTimeBlockTitleFromFocus,
  parseFocusSessionCreateInput,
} from "./focus-shared";

describe("parseFocusSessionCreateInput", () => {
  it("accepts valid planned session", () => {
    const { fields, error } = parseFocusSessionCreateInput({
      categoryId: "cat_1",
      plannedDurationMinutes: 25,
      title: "Deep work",
    });
    expect(error).toBeNull();
    expect(fields.categoryId).toBe("cat_1");
    expect(fields.plannedDurationMinutes).toBe(25);
    expect(fields.status).toBe("planned");
    expect(fields.endTime).toBeNull();
  });

  it("rejects non-positive planned duration", () => {
    const { error } = parseFocusSessionCreateInput({
      categoryId: "cat_1",
      plannedDurationMinutes: 0,
    });
    expect(error).toBe("invalid_planned_duration");
  });
});

describe("buildFocusSessionEndUpdate", () => {
  it("computes actual duration minutes", () => {
    const start = new Date("2026-05-21T10:00:00");
    const end = new Date("2026-05-21T10:25:00");
    const result = buildFocusSessionEndUpdate({ startTime: start }, end);
    expect(result).toEqual({
      endTime: end,
      actualDurationMinutes: 25,
    });
  });

  it("rejects end before start", () => {
    const start = new Date("2026-05-21T10:00:00");
    const end = new Date("2026-05-21T09:00:00");
    expect(buildFocusSessionEndUpdate({ startTime: start }, end)).toBe(
      "invalid_range",
    );
  });
});

describe("canConvertFocusSession", () => {
  it("allows completed sessions with end time", () => {
    expect(
      canConvertFocusSession({
        status: "completed",
        convertedToTimeBlock: false,
        endTime: new Date(),
      }),
    ).toBe(true);
  });

  it("rejects already converted sessions", () => {
    expect(
      canConvertFocusSession({
        status: "converted",
        convertedToTimeBlock: true,
        endTime: new Date(),
      }),
    ).toBe(false);
  });

  it("rejects abandoned and running sessions", () => {
    expect(
      canConvertFocusSession({
        status: "abandoned",
        convertedToTimeBlock: false,
        endTime: new Date(),
      }),
    ).toBe(false);
    expect(
      canConvertFocusSession({
        status: "running",
        convertedToTimeBlock: false,
        endTime: null,
      }),
    ).toBe(false);
  });
});

describe("defaultTimeBlockTitleFromFocus", () => {
  it("uses session title when present", () => {
    expect(
      defaultTimeBlockTitleFromFocus({
        title: "Writing",
        plannedDurationMinutes: 25,
      }),
    ).toBe("Writing");
  });

  it("falls back to default focus session title", () => {
    expect(
      defaultTimeBlockTitleFromFocus({
        title: null,
        plannedDurationMinutes: 50,
      }),
    ).toBe(DEFAULT_FOCUS_TIME_BLOCK_TITLE);
  });

  it("uses custom fallback title", () => {
    expect(
      defaultTimeBlockTitleFromFocus(
        { title: null, plannedDurationMinutes: 25 },
        "专注会话",
      ),
    ).toBe("专注会话");
  });
});

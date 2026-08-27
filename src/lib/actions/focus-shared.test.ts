import { describe, expect, it } from "vitest";
import {
  buildFocusSessionEndUpdate,
  canConvertFocusSession,
  DEFAULT_FOCUS_TIME_BLOCK_TITLE,
  defaultTimeBlockTitleFromFocus,
  parseFocusSessionCreateInput,
  resolveTimeBlockCategoryId,
  withOwnedTimeBlockCategory,
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

  it("still requires a category when creating a session", () => {
    const { error } = parseFocusSessionCreateInput({
      categoryId: "",
      plannedDurationMinutes: 25,
    });
    expect(error).toBe("invalid_category");
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

describe("resolveTimeBlockCategoryId", () => {
  it("uses the session category and ignores a forged target", () => {
    const result = resolveTimeBlockCategoryId({
      sessionCategoryId: "cat_a",
      targetCategoryId: "cat_b",
    });
    expect(result).toEqual({ ok: true, categoryId: "cat_a" });
  });

  it("uses the explicit target when the session category is gone", () => {
    expect(
      resolveTimeBlockCategoryId({
        sessionCategoryId: null,
        targetCategoryId: "cat_b",
      }),
    ).toEqual({ ok: true, categoryId: "cat_b" });
  });

  it("asks the client to pick a category when orphan and target is missing", () => {
    expect(
      resolveTimeBlockCategoryId({
        sessionCategoryId: null,
      }),
    ).toEqual({ ok: false, error: "needs_category" });
    expect(
      resolveTimeBlockCategoryId({
        sessionCategoryId: "   ",
        targetCategoryId: "",
      }),
    ).toEqual({ ok: false, error: "needs_category" });
  });
});

describe("withOwnedTimeBlockCategory", () => {
  it("keeps needs_category when the session is orphan and no target was chosen", () => {
    expect(
      withOwnedTimeBlockCategory(
        { ok: false, error: "needs_category" },
        false,
      ),
    ).toEqual({ ok: false, error: "needs_category" });
  });

  it("maps another user's or missing target to invalid_category without leaking existence", () => {
    const resolved = resolveTimeBlockCategoryId({
      sessionCategoryId: null,
      targetCategoryId: "cat_other_user",
    });
    expect(resolved).toEqual({ ok: true, categoryId: "cat_other_user" });
    expect(withOwnedTimeBlockCategory(resolved, false)).toEqual({
      ok: false,
      error: "invalid_category",
    });
  });

  it("accepts an owned target for an orphan session", () => {
    const resolved = resolveTimeBlockCategoryId({
      sessionCategoryId: null,
      targetCategoryId: "cat_work",
    });
    expect(withOwnedTimeBlockCategory(resolved, true)).toEqual({
      ok: true,
      categoryId: "cat_work",
    });
  });

  it("still uses the original category when the session is not orphan", () => {
    const resolved = resolveTimeBlockCategoryId({
      sessionCategoryId: "cat_a",
      targetCategoryId: "cat_b",
    });
    expect(withOwnedTimeBlockCategory(resolved, true)).toEqual({
      ok: true,
      categoryId: "cat_a",
    });
  });
});

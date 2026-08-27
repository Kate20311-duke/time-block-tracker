import { describe, expect, it } from "vitest";
import {
  categoryScopeWhere,
  focusSessionScopeWhere,
  timeBlockScopeWhere,
} from "./scoped-where";
import { isScopedAccessError, ScopedAccessError } from "./scoped-errors";

describe("scoped where builders", () => {
  it("scopes categories by userId", () => {
    expect(categoryScopeWhere("user_1")).toEqual({ userId: "user_1" });
  });

  it("merges extra category filters with AND", () => {
    expect(categoryScopeWhere("user_1", { id: "cat_1" })).toEqual({
      AND: [{ userId: "user_1" }, { id: "cat_1" }],
    });
  });

  it("scopes time blocks through category.userId", () => {
    expect(timeBlockScopeWhere("user_1")).toEqual({
      category: { userId: "user_1" },
    });
  });

  it("merges extra time block filters with AND", () => {
    expect(
      timeBlockScopeWhere("user_1", {
        startTime: { lt: new Date("2026-05-22") },
      }),
    ).toEqual({
      AND: [
        { category: { userId: "user_1" } },
        { startTime: { lt: new Date("2026-05-22") } },
      ],
    });
  });

  it("scopes focus sessions by userId, not category.userId", () => {
    expect(focusSessionScopeWhere("user_2")).toEqual({
      userId: "user_2",
    });
  });

  it("merges extra focus session filters with AND", () => {
    expect(
      focusSessionScopeWhere("user_2", { status: "running" }),
    ).toEqual({
      AND: [{ userId: "user_2" }, { status: "running" }],
    });
  });
});

describe("ScopedAccessError", () => {
  it("is detected by isScopedAccessError", () => {
    expect(isScopedAccessError(new ScopedAccessError())).toBe(true);
    expect(isScopedAccessError(new Error())).toBe(false);
  });
});

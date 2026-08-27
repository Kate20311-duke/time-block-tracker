import { describe, expect, it } from "vitest";
import {
  FOCUS_CATEGORY_REMOVED_ID,
  focusCategoryDisplay,
  hasAvailableSaveCategories,
  hasFocusCategoryId,
} from "./focus-category-display";

describe("hasFocusCategoryId", () => {
  it("treats null, undefined, and blank as missing", () => {
    expect(hasFocusCategoryId(null)).toBe(false);
    expect(hasFocusCategoryId(undefined)).toBe(false);
    expect(hasFocusCategoryId("")).toBe(false);
    expect(hasFocusCategoryId("   ")).toBe(false);
    expect(hasFocusCategoryId("cat_1")).toBe(true);
  });
});

describe("focusCategoryDisplay", () => {
  it("uses Category removed fallback when category is null", () => {
    expect(focusCategoryDisplay(null, "Category removed")).toEqual({
      id: null,
      name: "Category removed",
      color: "",
      removed: true,
    });
  });

  it("keeps the live category when present", () => {
    expect(
      focusCategoryDisplay(
        { id: "cat_1", name: "Study", color: "#22c55e" },
        "Category removed",
      ),
    ).toEqual({
      id: "cat_1",
      name: "Study",
      color: "#22c55e",
      removed: false,
    });
  });

  it("does not use Uncategorized as the fallback label", () => {
    const display = focusCategoryDisplay(null, "分类已删除");
    expect(display.name).toBe("分类已删除");
    expect(display.name).not.toMatch(/未分类|Uncategorized/i);
    expect(FOCUS_CATEGORY_REMOVED_ID).toBe("__category_removed__");
  });
});

describe("hasAvailableSaveCategories", () => {
  it("is false when the user has no categories to save into", () => {
    expect(hasAvailableSaveCategories([])).toBe(false);
    expect(hasAvailableSaveCategories([{ id: "cat_1" }])).toBe(true);
  });
});

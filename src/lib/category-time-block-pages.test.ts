import { describe, expect, it } from "vitest";
import { appendCategoryTimeBlockPages } from "./category-time-block-pages";
import type { CategoryTimeBlockListItem } from "./category-time-blocks";

function item(id: string, title = id): CategoryTimeBlockListItem {
  return {
    id,
    title,
    dateLabel: "Aug 26, 2026",
    timeRangeLabel: "09:00 – 10:00",
    durationLabel: "1h",
  };
}

describe("appendCategoryTimeBlockPages", () => {
  it("appends page 2 after page 1", () => {
    const page1 = [item("a"), item("b")];
    const page2 = [item("c"), item("d")];
    expect(appendCategoryTimeBlockPages(page1, page2).map((row) => row.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("drops duplicate ids from the next page and keeps existing order", () => {
    const existing = [item("a", "First A"), item("b")];
    const nextPage = [item("b", "Dup B"), item("a", "Dup A"), item("c")];
    const merged = appendCategoryTimeBlockPages(existing, nextPage);
    expect(merged.map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(merged[0]?.title).toBe("First A");
  });
});

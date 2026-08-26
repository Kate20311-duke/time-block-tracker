import { describe, expect, it } from "vitest";
import {
  areAllVisibleSelected,
  clearSelectedIds,
  deselectVisibleIds,
  pruneSelectedIds,
  selectVisibleIds,
  toggleSelectedId,
  uniqueVisibleIds,
} from "./category-time-block-selection";

const VISIBLE_20 = Array.from({ length: 20 }, (_, index) => `tb-${index + 1}`);

describe("toggleSelectedId", () => {
  it("selects an id then deselects it", () => {
    const selected = toggleSelectedId(new Set(), "tb-1");
    expect(selected.has("tb-1")).toBe(true);
    expect(selected.size).toBe(1);

    const deselected = toggleSelectedId(selected, "tb-1");
    expect(deselected.has("tb-1")).toBe(false);
    expect(deselected.size).toBe(0);
  });

  it("supports selecting multiple ids", () => {
    const selected = toggleSelectedId(toggleSelectedId(new Set(), "A"), "B");
    expect(selected.size).toBe(2);
    expect([...selected]).toEqual(["A", "B"]);
  });
});

describe("selectVisibleIds", () => {
  it("selects all currently visible ids, at most the loaded list", () => {
    const selected = selectVisibleIds(VISIBLE_20);
    expect(selected.size).toBe(20);
    expect(selected.has("tb-1")).toBe(true);
    expect(selected.has("tb-20")).toBe(true);
    expect(selected.has("tb-21")).toBe(false);
  });

  it("does not inflate count when visible ids are duplicated", () => {
    expect(selectVisibleIds(["a", "a", "b", "a"]).size).toBe(2);
    expect(uniqueVisibleIds(["a", "b", "a", "b"])).toEqual(["a", "b"]);
  });
});

describe("deselectVisibleIds", () => {
  it("clears currently visible ids when all visible are selected", () => {
    const selected = selectVisibleIds(["a", "b", "c"]);
    expect(areAllVisibleSelected(selected, ["a", "b", "c"])).toBe(true);
    expect(deselectVisibleIds(selected, ["a", "b", "c"]).size).toBe(0);
  });
});

describe("clearSelectedIds", () => {
  it("returns an empty selection", () => {
    const selected = selectVisibleIds(["a", "b"]);
    expect(clearSelectedIds().size).toBe(0);
    expect(selected.size).toBe(2);
  });
});

describe("areAllVisibleSelected", () => {
  it("is false when none or only some visible ids are selected", () => {
    expect(areAllVisibleSelected(new Set(), ["a", "b"])).toBe(false);
    expect(areAllVisibleSelected(new Set(["a"]), ["a", "b"])).toBe(false);
    expect(areAllVisibleSelected(new Set(["a", "b"]), [])).toBe(false);
  });
});

describe("pruneSelectedIds", () => {
  it("drops ids that are no longer visible after a list replace", () => {
    const pruned = pruneSelectedIds(new Set(["keep", "gone"]), ["keep"]);
    expect([...pruned]).toEqual(["keep"]);
  });
});

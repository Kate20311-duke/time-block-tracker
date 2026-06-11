import { describe, expect, it } from "vitest";

import {
  canSubmitGenerate,
  getDefaultSelectedRoutineIds,
  isRoutineGenerateable,
  pruneSelectedRoutineIds,
  resolveGenerateButtonState,
} from "@/lib/routines/routine-generate-ui";
import type { RoutineGenerateListItem } from "@/lib/routines/routine-types";

function item(
  overrides: Partial<RoutineGenerateListItem> = {},
): RoutineGenerateListItem {
  return {
    id: "r1",
    title: "上班",
    categoryId: "cat-1",
    categoryName: "工作",
    startTime: "09:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    startDate: "2026-06-01",
    endDate: null,
    isActive: true,
    ...overrides,
  };
}

describe("isRoutineGenerateable", () => {
  it("requires active status and category", () => {
    expect(isRoutineGenerateable(item())).toBe(true);
    expect(isRoutineGenerateable(item({ isActive: false }))).toBe(false);
    expect(isRoutineGenerateable(item({ categoryId: null }))).toBe(false);
  });
});

describe("selection helpers", () => {
  it("defaults to all generateable routines", () => {
    expect(
      getDefaultSelectedRoutineIds([
        item(),
        item({ id: "r2", categoryId: null }),
        item({ id: "r3", isActive: false }),
      ]),
    ).toEqual(["r1"]);
  });

  it("prunes invalid selected ids", () => {
    expect(
      [...pruneSelectedRoutineIds(["r1", "r2", "missing"], [item(), item({ id: "r2", categoryId: null })])],
    ).toEqual(["r1"]);
  });
});

describe("resolveGenerateButtonState", () => {
  it("blocks submit when nothing selected or no matches", () => {
    expect(
      resolveGenerateButtonState({
        isGenerating: false,
        rangeValidationError: null,
        selectedCount: 0,
        estimatedCount: 5,
      }),
    ).toBe("no_selection");
    expect(
      resolveGenerateButtonState({
        isGenerating: false,
        rangeValidationError: null,
        selectedCount: 1,
        estimatedCount: 0,
      }),
    ).toBe("no_matches");
    expect(
      canSubmitGenerate(
        resolveGenerateButtonState({
          isGenerating: false,
          rangeValidationError: null,
          selectedCount: 1,
          estimatedCount: 3,
        }),
      ),
    ).toBe(true);
  });
});

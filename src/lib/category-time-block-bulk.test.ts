import { describe, expect, it } from "vitest";
import {
  canSubmitBulkTimeBlocks,
  isBulkTimeBlockSelectionOverLimit,
  MAX_BULK_TIME_BLOCKS,
} from "./category-time-block-bulk";

describe("bulk selection limit", () => {
  it("allows Move/Delete at or below the server max", () => {
    expect(isBulkTimeBlockSelectionOverLimit(0)).toBe(false);
    expect(isBulkTimeBlockSelectionOverLimit(MAX_BULK_TIME_BLOCKS)).toBe(false);
    expect(canSubmitBulkTimeBlocks(1)).toBe(true);
    expect(canSubmitBulkTimeBlocks(MAX_BULK_TIME_BLOCKS)).toBe(true);
  });

  it("blocks Move/Delete when more than 100 are selected", () => {
    expect(isBulkTimeBlockSelectionOverLimit(MAX_BULK_TIME_BLOCKS + 1)).toBe(
      true,
    );
    expect(canSubmitBulkTimeBlocks(101)).toBe(false);
    expect(canSubmitBulkTimeBlocks(0)).toBe(false);
  });
});

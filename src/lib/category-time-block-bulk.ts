export const MAX_BULK_TIME_BLOCKS = 100;

export function sanitizeTimeBlockIds(
  ids: readonly string[],
  max: number = MAX_BULK_TIME_BLOCKS,
): { ok: true; ids: string[] } | { ok: false; error: "too_many" } {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const raw of ids) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(id);
    if (unique.length > max) {
      return { ok: false, error: "too_many" };
    }
  }

  return { ok: true, ids: unique };
}

export function isBulkTimeBlockSelectionOverLimit(
  selectedCount: number,
  max: number = MAX_BULK_TIME_BLOCKS,
): boolean {
  return selectedCount > max;
}

export function canSubmitBulkTimeBlocks(
  selectedCount: number,
  max: number = MAX_BULK_TIME_BLOCKS,
): boolean {
  return selectedCount > 0 && !isBulkTimeBlockSelectionOverLimit(selectedCount, max);
}

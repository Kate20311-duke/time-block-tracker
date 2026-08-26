import type { CategoryTimeBlockListItem } from "@/lib/category-time-blocks";

/** Append a loaded page, dropping duplicate ids and keeping existing order. */
export function appendCategoryTimeBlockPages(
  existing: readonly CategoryTimeBlockListItem[],
  nextPage: readonly CategoryTimeBlockListItem[],
): CategoryTimeBlockListItem[] {
  const merged = [...existing];
  const seen = new Set(existing.map((block) => block.id));

  for (const item of nextPage) {
    if (!item.id || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

/**
 * Display helpers for FocusSession / FocusSegment whose Category relation is null.
 *
 * Null category means the original category was later deleted — not “created
 * without a category”. Create paths still require a Category.
 */

export const FOCUS_CATEGORY_REMOVED_ID = "__category_removed__";

export type FocusCategoryDisplay = {
  id: string | null;
  name: string;
  color: string;
  removed: boolean;
};

export function hasAvailableSaveCategories(
  categories: readonly { id: string }[],
): boolean {
  return categories.length > 0;
}

export function hasFocusCategoryId(
  categoryId: string | null | undefined,
): categoryId is string {
  return typeof categoryId === "string" && categoryId.trim().length > 0;
}

export function focusCategoryDisplay(
  category: { id: string; name: string; color: string } | null | undefined,
  removedLabel: string,
): FocusCategoryDisplay {
  if (category) {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      removed: false,
    };
  }
  return {
    id: null,
    name: removedLabel,
    color: "",
    removed: true,
  };
}

export function focusCategorySwatchProps(
  removed: boolean,
  color: string,
): { className: string; style?: { backgroundColor: string } } {
  if (removed || !color) {
    return { className: "bg-muted-foreground/40" };
  }
  return { className: "", style: { backgroundColor: color } };
}

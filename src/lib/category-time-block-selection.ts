/** Per-category TimeBlock selection helpers (Phase 61.3). Client-only; no DB. */

export function uniqueVisibleIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

export function toggleSelectedId(
  selectedIds: ReadonlySet<string>,
  id: string,
): Set<string> {
  const trimmed = id.trim();
  const next = new Set(selectedIds);
  if (!trimmed) {
    return next;
  }
  if (next.has(trimmed)) {
    next.delete(trimmed);
  } else {
    next.add(trimmed);
  }
  return next;
}

export function selectVisibleIds(visibleIds: readonly string[]): Set<string> {
  return new Set(uniqueVisibleIds(visibleIds));
}

export function deselectVisibleIds(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[],
): Set<string> {
  const visible = new Set(uniqueVisibleIds(visibleIds));
  return new Set([...selectedIds].filter((id) => !visible.has(id)));
}

export function clearSelectedIds(): Set<string> {
  return new Set();
}

export function areAllVisibleSelected(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[],
): boolean {
  const unique = uniqueVisibleIds(visibleIds);
  if (unique.length === 0) {
    return false;
  }
  return unique.every((id) => selectedIds.has(id));
}

export function pruneSelectedIds(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[],
): Set<string> {
  const visible = new Set(uniqueVisibleIds(visibleIds));
  return new Set([...selectedIds].filter((id) => visible.has(id)));
}

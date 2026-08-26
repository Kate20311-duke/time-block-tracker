import { Button } from "@/components/ui/button";
import type { CategoryTimeBlockListItem } from "@/lib/category-time-blocks";
import { areAllVisibleSelected } from "@/lib/category-time-block-selection";
import { formatMessage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type CategoryTimeBlockListLabels = {
  heading: string;
  empty: string;
  showingCount: string;
  loadMore: string;
  loadingMore: string;
  loading: string;
  loadFailed: string;
  retry: string;
  bulkSelectionLimit: string;
  selectedCount: string;
  selectVisible: string;
  deselectVisible: string;
  clearSelection: string;
  moveSelected: string;
  noOtherCategories: string;
  deleteSelected: string;
};

type Props = {
  loading: boolean;
  error: boolean;
  blocks: CategoryTimeBlockListItem[] | null;
  hasMore: boolean;
  totalCount: number;
  loadingMore: boolean;
  loadMoreError: boolean;
  selectedIds: ReadonlySet<string>;
  labels: CategoryTimeBlockListLabels;
  onRetry: () => void;
  onLoadMore: () => void;
  onToggleId: (id: string) => void;
  onSelectVisible: () => void;
  onDeselectVisible: () => void;
  onClearSelection: () => void;
  onMoveSelected: () => void;
  onDeleteSelected: () => void;
  canMove: boolean;
  bulkOverLimit: boolean;
};

export function CategoryTimeBlockList({
  loading,
  error,
  blocks,
  hasMore,
  totalCount,
  loadingMore,
  loadMoreError,
  selectedIds,
  labels,
  onRetry,
  onLoadMore,
  onToggleId,
  onSelectVisible,
  onDeselectVisible,
  onClearSelection,
  onMoveSelected,
  onDeleteSelected,
  canMove,
  bulkOverLimit,
}: Props) {
  if (loading && blocks === null) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {labels.loading}
      </p>
    );
  }

  if (error && blocks === null) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{labels.loadFailed}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {labels.retry}
        </Button>
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{labels.empty}</p>
    );
  }

  const visibleIds = blocks.map((block) => block.id);
  const allVisibleSelected = areAllVisibleSelected(selectedIds, visibleIds);
  const selectedCount = selectedIds.size;
  const canSubmitBulk = selectedCount > 0 && !bulkOverLimit;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{labels.heading}</p>
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-muted-foreground">
              {formatMessage(labels.selectedCount, { count: selectedCount })}
            </p>
            {bulkOverLimit ? (
              <p className="max-w-full text-sm break-words text-destructive">
                {labels.bulkSelectionLimit}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canMove || !canSubmitBulk}
              title={
                bulkOverLimit
                  ? labels.bulkSelectionLimit
                  : canMove
                    ? undefined
                    : labels.noOtherCategories
              }
              onClick={onMoveSelected}
            >
              {labels.moveSelected}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!canSubmitBulk}
              title={bulkOverLimit ? labels.bulkSelectionLimit : undefined}
              onClick={onDeleteSelected}
            >
              {labels.deleteSelected}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={
                allVisibleSelected ? onDeselectVisible : onSelectVisible
              }
            >
              {allVisibleSelected
                ? labels.deselectVisible
                : labels.selectVisible}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
            >
              {labels.clearSelection}
            </Button>
          </div>
        </div>
      ) : null}
      <ul className="divide-y rounded-md border">
        {blocks.map((block) => {
          const selected = selectedIds.has(block.id);
          return (
            <li key={block.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-3 py-2.5",
                  selected ? "bg-muted/60" : "hover:bg-muted/40",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-primary"
                  checked={selected}
                  onChange={() => onToggleId(block.id)}
                />
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-medium break-words">
                      {block.title}
                    </span>
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground sm:text-sm">
                      {block.durationLabel}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {block.dateLabel} · {block.timeRangeLabel}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {formatMessage(labels.showingCount, {
            loaded: blocks.length,
            total: totalCount,
          })}
        </p>
        {loadMoreError ? (
          <p className="text-sm text-muted-foreground">{labels.loadFailed}</p>
        ) : null}
        {hasMore || loadMoreError ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore
              ? labels.loadingMore
              : loadMoreError
                ? labels.retry
                : labels.loadMore}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CategoryTimeBlockList } from "@/components/categories/category-time-block-list";
import { DeleteTimeBlocksDialog } from "@/components/categories/delete-time-blocks-dialog";
import { MoveTimeBlocksDialog } from "@/components/categories/move-time-blocks-dialog";
import { deleteCategory, updateCategory } from "@/lib/actions/categories";
import {
  deleteTimeBlocksBulk,
  listCategoryTimeBlocks,
  moveTimeBlocksToCategory,
} from "@/lib/actions/category-time-blocks";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  CategoryTimeBlockCursor,
  CategoryTimeBlockListItem,
} from "@/lib/category-time-blocks";
import {
  canSubmitBulkTimeBlocks,
  isBulkTimeBlockSelectionOverLimit,
} from "@/lib/category-time-block-bulk";
import { appendCategoryTimeBlockPages } from "@/lib/category-time-block-pages";
import {
  clearSelectedIds,
  deselectVisibleIds,
  selectVisibleIds,
  toggleSelectedId,
} from "@/lib/category-time-block-selection";
import { formatMessage } from "@/lib/i18n";

export type CategoryRowData = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  timeBlockCount: number;
  focusSessionCount: number;
};

export type CategoryRowOption = {
  id: string;
  name: string;
};

type Labels = {
  name: string;
  color: string;
  descriptionOptional: string;
  timeBlockCountFormatted: string;
  focusSessionCountFormatted: string;
  cannotDeleteFormatted: string | null;
  confirmDelete: string;
  confirmDeleteTitle: string;
  edit: string;
  save: string;
  cancel: string;
  delete: string;
  submitting: string;
  showTimeBlocks: string;
  hideTimeBlocks: string;
  timeBlocksHeading: string;
  timeBlocksEmpty: string;
  timeBlocksShowingCount: string;
  timeBlocksLoadMore: string;
  timeBlocksLoadingMore: string;
  timeBlocksLoading: string;
  timeBlocksLoadFailed: string;
  timeBlocksRetry: string;
  timeBlocksBulkSelectionLimit: string;
  timeBlocksSelectedCount: string;
  timeBlocksSelectVisible: string;
  timeBlocksDeselectVisible: string;
  timeBlocksClearSelection: string;
  timeBlocksMoveSelected: string;
  timeBlocksMoveTitle: string;
  timeBlocksMoveTargetCategory: string;
  timeBlocksMoveSelectTarget: string;
  timeBlocksMoveDescription: string;
  timeBlocksMoveConfirm: string;
  timeBlocksMoving: string;
  timeBlocksMoveSuccess: string;
  timeBlocksMoveFailed: string;
  timeBlocksNoOtherCategories: string;
  timeBlocksDeleteSelected: string;
  timeBlocksDeleteTitle: string;
  timeBlocksDeleteDescription: string;
  timeBlocksDeleteConfirm: string;
  timeBlocksDeleting: string;
  timeBlocksDeleteSuccess: string;
  timeBlocksDeleteFailed: string;
};

type TimeBlockListCache = {
  blocks: CategoryTimeBlockListItem[];
  hasMore: boolean;
  nextCursor: CategoryTimeBlockCursor | null;
};

type Props = {
  category: CategoryRowData;
  otherCategories: CategoryRowOption[];
  labels: Labels;
};

export function CategoryRow({ category, otherCategories, labels }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [blocks, setBlocks] = useState<CategoryTimeBlockListItem[] | null>(
    null,
  );
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<CategoryTimeBlockCursor | null>(
    null,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [moveOpen, setMoveOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cacheRef = useRef<TimeBlockListCache | null>(null);
  const inFlightRef = useRef(false);
  const loadMoreInFlightRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const countSignalRef = useRef(category.timeBlockCount);
  const deleteDisabled = labels.cannotDeleteFormatted !== null;
  const canMove = otherCategories.length > 0;

  const loadTimeBlocks = useCallback(async (force = false) => {
    if (!force && cacheRef.current !== null) {
      setBlocks(cacheRef.current.blocks);
      setHasMore(cacheRef.current.hasMore);
      setNextCursor(cacheRef.current.nextCursor);
      setLoadMoreError(false);
      return;
    }
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setLoadError(false);
    setLoadMoreError(false);

    try {
      const result = await listCategoryTimeBlocks({
        categoryId: category.id,
      });
      if (generation !== loadGenerationRef.current) {
        return;
      }
      if (!result.ok) {
        setLoadError(true);
        return;
      }
      const cache: TimeBlockListCache = {
        blocks: result.blocks,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
      cacheRef.current = cache;
      setBlocks(cache.blocks);
      setHasMore(cache.hasMore);
      setNextCursor(cache.nextCursor);
    } catch {
      if (generation !== loadGenerationRef.current) {
        return;
      }
      setLoadError(true);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
        inFlightRef.current = false;
      }
    }
  }, [category.id]);

  const loadMoreTimeBlocks = useCallback(async () => {
    if (
      loadMoreInFlightRef.current ||
      loading ||
      !hasMore ||
      nextCursor == null
    ) {
      return;
    }

    loadMoreInFlightRef.current = true;
    const generation = loadGenerationRef.current;
    setLoadingMore(true);
    setLoadMoreError(false);

    try {
      const result = await listCategoryTimeBlocks({
        categoryId: category.id,
        cursor: nextCursor,
      });
      if (generation !== loadGenerationRef.current) {
        return;
      }
      if (!result.ok) {
        setLoadMoreError(true);
        return;
      }

      const existing = cacheRef.current?.blocks ?? [];
      const merged = appendCategoryTimeBlockPages(existing, result.blocks);
      cacheRef.current = {
        blocks: merged,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
      setBlocks(merged);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch {
      if (generation !== loadGenerationRef.current) {
        return;
      }
      setLoadMoreError(true);
    } finally {
      loadMoreInFlightRef.current = false;
      if (generation === loadGenerationRef.current) {
        setLoadingMore(false);
      }
    }
  }, [category.id, hasMore, loading, nextCursor]);

  function resetSelection() {
    setSelectedIds(clearSelectedIds());
  }

  useEffect(() => {
    if (countSignalRef.current === category.timeBlockCount) {
      return;
    }
    countSignalRef.current = category.timeBlockCount;
    loadGenerationRef.current += 1;
    inFlightRef.current = false;
    loadMoreInFlightRef.current = false;
    cacheRef.current = null;
    setBlocks(null);
    setHasMore(false);
    setNextCursor(null);
    setLoadError(false);
    setLoadMoreError(false);
    setLoadingMore(false);
    setSelectedIds(clearSelectedIds());
    if (expanded) {
      void loadTimeBlocks(true);
    }
  }, [category.timeBlockCount, expanded, loadTimeBlocks]);

  function toggleTimeBlocks() {
    if (expanded) {
      setExpanded(false);
      resetSelection();
      return;
    }
    setExpanded(true);
    void loadTimeBlocks();
  }

  async function handleMove(targetCategoryId: string) {
    if (moving || deleting || !canSubmitBulkTimeBlocks(selectedIds.size)) {
      return;
    }

    setMoving(true);
    try {
      const result = await moveTimeBlocksToCategory({
        timeBlockIds: [...selectedIds],
        targetCategoryId,
      });
      if (!result.ok) {
        toast.error(labels.timeBlocksMoveFailed);
        return;
      }

      const targetName =
        otherCategories.find((item) => item.id === targetCategoryId)?.name ??
        "";
      if (result.movedCount > 0) {
        toast.success(
          formatMessage(labels.timeBlocksMoveSuccess, {
            count: result.movedCount,
            name: targetName,
          }),
        );
      }
      setMoveOpen(false);
      resetSelection();
      if (result.movedCount > 0) {
        router.refresh();
      }
    } catch {
      toast.error(labels.timeBlocksMoveFailed);
    } finally {
      setMoving(false);
    }
  }

  async function handleDelete() {
    if (deleting || moving || !canSubmitBulkTimeBlocks(selectedIds.size)) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteTimeBlocksBulk({
        timeBlockIds: [...selectedIds],
      });
      if (!result.ok) {
        toast.error(labels.timeBlocksDeleteFailed);
        return;
      }

      if (result.deletedCount > 0) {
        toast.success(
          formatMessage(labels.timeBlocksDeleteSuccess, {
            count: result.deletedCount,
          }),
        );
      }
      setDeleteOpen(false);
      resetSelection();
      if (result.deletedCount > 0) {
        router.refresh();
      }
    } catch {
      toast.error(labels.timeBlocksDeleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
              aria-hidden
            />
            <CardDescription>{category.name}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={updateCategory} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={category.id} />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{labels.name}</span>
              <Input name="name" required defaultValue={category.name} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{labels.color}</span>
              <Input
                name="color"
                type="color"
                defaultValue={category.color}
                className="h-9 w-16 cursor-pointer p-1"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">{labels.descriptionOptional}</span>
              <Textarea
                name="description"
                rows={2}
                defaultValue={category.description ?? ""}
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <SubmitButton
                label={labels.save}
                pendingLabel={labels.submitting}
                variant="secondary"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                {labels.cancel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start gap-3">
          <span
            className="mt-1 h-8 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{category.name}</p>
              <Badge variant="outline" className="tabular-nums">
                {labels.timeBlockCountFormatted}
              </Badge>
              {category.focusSessionCount > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {labels.focusSessionCountFormatted}
                </Badge>
              ) : null}
            </div>
            {category.description ? (
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            ) : null}
            {labels.cannotDeleteFormatted ? (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  {labels.cannotDeleteFormatted}
                </p>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={expanded}
              onClick={toggleTimeBlocks}
            >
              {expanded ? labels.hideTimeBlocks : labels.showTimeBlocks}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetSelection();
                setEditing(true);
              }}
            >
              {labels.edit}
            </Button>
            <DeleteConfirmButton
              action={deleteCategory}
              id={category.id}
              confirmMessage={labels.confirmDelete}
              confirmTitle={labels.confirmDeleteTitle}
              cancelLabel={labels.cancel}
              deleteLabel={labels.delete}
              disabled={deleteDisabled}
            />
          </div>
        </div>
        {expanded ? (
          <>
            <Separator className="my-4" />
            <CategoryTimeBlockList
              loading={loading}
              error={loadError}
              blocks={blocks}
              hasMore={hasMore}
              totalCount={category.timeBlockCount}
              loadingMore={loadingMore}
              loadMoreError={loadMoreError}
              selectedIds={selectedIds}
              canMove={canMove}
              bulkOverLimit={isBulkTimeBlockSelectionOverLimit(selectedIds.size)}
              labels={{
                heading: labels.timeBlocksHeading,
                empty: labels.timeBlocksEmpty,
                showingCount: labels.timeBlocksShowingCount,
                loadMore: labels.timeBlocksLoadMore,
                loadingMore: labels.timeBlocksLoadingMore,
                loading: labels.timeBlocksLoading,
                loadFailed: labels.timeBlocksLoadFailed,
                retry: labels.timeBlocksRetry,
                bulkSelectionLimit: labels.timeBlocksBulkSelectionLimit,
                selectedCount: labels.timeBlocksSelectedCount,
                selectVisible: labels.timeBlocksSelectVisible,
                deselectVisible: labels.timeBlocksDeselectVisible,
                clearSelection: labels.timeBlocksClearSelection,
                moveSelected: labels.timeBlocksMoveSelected,
                noOtherCategories: labels.timeBlocksNoOtherCategories,
                deleteSelected: labels.timeBlocksDeleteSelected,
              }}
              onRetry={() => {
                cacheRef.current = null;
                setBlocks(null);
                setHasMore(false);
                setNextCursor(null);
                setLoadMoreError(false);
                resetSelection();
                void loadTimeBlocks(true);
              }}
              onLoadMore={() => {
                void loadMoreTimeBlocks();
              }}
              onToggleId={(id) => {
                setSelectedIds((current) => toggleSelectedId(current, id));
              }}
              onSelectVisible={() => {
                setSelectedIds(
                  selectVisibleIds(blocks?.map((block) => block.id) ?? []),
                );
              }}
              onDeselectVisible={() => {
                setSelectedIds((current) =>
                  deselectVisibleIds(
                    current,
                    blocks?.map((block) => block.id) ?? [],
                  ),
                );
              }}
              onClearSelection={resetSelection}
              onMoveSelected={() => setMoveOpen(true)}
              onDeleteSelected={() => setDeleteOpen(true)}
            />
          </>
        ) : null}
        <MoveTimeBlocksDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          sourceCategoryName={category.name}
          selectedCount={selectedIds.size}
          categories={otherCategories}
          pending={moving}
          labels={{
            title: labels.timeBlocksMoveTitle,
            targetCategory: labels.timeBlocksMoveTargetCategory,
            selectTarget: labels.timeBlocksMoveSelectTarget,
            description: labels.timeBlocksMoveDescription,
            confirm: labels.timeBlocksMoveConfirm,
            moving: labels.timeBlocksMoving,
            cancel: labels.cancel,
          }}
          onConfirm={(targetCategoryId) => {
            void handleMove(targetCategoryId);
          }}
        />
        <DeleteTimeBlocksDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          selectedCount={selectedIds.size}
          pending={deleting}
          labels={{
            title: labels.timeBlocksDeleteTitle,
            description: labels.timeBlocksDeleteDescription,
            confirm: labels.timeBlocksDeleteConfirm,
            deleting: labels.timeBlocksDeleting,
            cancel: labels.cancel,
          }}
          onConfirm={() => {
            void handleDelete();
          }}
        />
      </CardContent>
    </Card>
  );
}

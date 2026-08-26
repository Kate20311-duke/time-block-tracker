import { CategoryRow } from "@/components/category-row";
import { CategoryEmptyState } from "@/components/categories/category-empty-state";
import { CategoryFormCard } from "@/components/categories/category-form-card";
import { CategoryPageHeader } from "@/components/categories/category-page-header";
import { PageFeedback } from "@/components/page-feedback";
import { createCategory } from "@/lib/actions/categories";
import { loadCategoryTimeBlockDurationMinutesByCategoryId } from "@/lib/category-time-block-duration";
import { formatMessage, getDictionary } from "@/lib/i18n";
import { categoriesForUser } from "@/lib/db/scoped";
import {
  isFocusSessionPlanned,
  isFocusSessionRunning,
} from "@/lib/focus-session-status";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { formatDurationMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
    timeBlocks?: string;
    activeFocus?: string;
    blockingFocus?: string;
  }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { success, error, timeBlocks, activeFocus, blockingFocus } =
    await searchParams;
  const user = await requireUser();

  const categories = await categoriesForUser(user.id, {
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { timeBlocks: true, focusSessions: true } },
      focusSessions: {
        where: { status: { not: "abandoned" } },
        select: { id: true, status: true },
      },
    },
  });
  const durationByCategoryId =
    await loadCategoryTimeBlockDurationMinutesByCategoryId(
      user.id,
      categories.map((category) => category.id),
    );

  const successMessage =
    success === "created"
      ? t.categories.success.created
      : success === "updated"
        ? t.categories.success.updated
        : success === "deleted"
          ? t.categories.success.deleted
          : null;

  const errorMessage =
    error === "has-records"
      ? t.categories.errors.hasRecords
      : error === "has-time-blocks"
        ? formatMessage(t.categories.errors.hasTimeBlocksDetail, {
            timeBlocks: timeBlocks ?? "0",
            activeFocus: activeFocus ?? "0",
            blockingFocus: blockingFocus ?? "0",
          })
        : error === "has-active-focus"
          ? formatMessage(t.categories.errors.hasActiveFocusDetail, {
              activeFocus: activeFocus ?? "0",
              blockingFocus: blockingFocus ?? "0",
            })
          : error === "has-completed-focus"
            ? formatMessage(t.categories.errors.hasCompletedFocusDetail, {
                blockingFocus: blockingFocus ?? "0",
              })
            : error === "delete_failed"
              ? t.categories.errors.deleteFailed
              : error === "empty_name"
                ? t.categories.errors.emptyName
                : null;

  const createFormKey = success === "created" ? "created" : "default";

  return (
    <div className="space-y-6">
      <CategoryPageHeader
        labels={{
          title: t.categories.title,
          pageDescription: t.categories.pageDescription,
        }}
      />

      <PageFeedback
        successMessage={successMessage}
        errorMessage={errorMessage}
        errorTitle={t.common.errorTitle}
      />

      <CategoryFormCard
        formKey={createFormKey}
        action={createCategory}
        labels={{
          newCategory: t.categories.newCategory,
          name: t.categories.name,
          namePlaceholder: t.categories.namePlaceholder,
          color: t.categories.color,
          descriptionOptional: t.categories.descriptionOptional,
          descriptionPlaceholder: t.categories.descriptionPlaceholder,
          create: t.common.create,
          submitting: t.common.submitting,
        }}
      />

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t.categories.allCategories}</h2>
        {categories.length === 0 ? (
          <CategoryEmptyState
            labels={{
              empty: t.categories.empty,
              emptyHint: t.categories.emptyHint,
            }}
          />
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const timeBlockCount = category._count.timeBlocks;
              const totalDurationMinutes =
                durationByCategoryId.get(category.id) ?? 0;
              const timeBlockCountFormatted =
                timeBlockCount === 0
                  ? formatMessage(t.categories.timeBlockCount, {
                      count: timeBlockCount,
                    })
                  : formatMessage(t.categories.timeBlockCountWithDuration, {
                      count: timeBlockCount,
                      duration: formatDurationMinutes(
                        totalDurationMinutes,
                        locale,
                      ),
                    });
              const focusSessionCount = category._count.focusSessions;
              const blockingFocusSessions = category.focusSessions;
              const activeFocusCount = blockingFocusSessions.filter(
                (s) =>
                  isFocusSessionRunning(s.status) ||
                  isFocusSessionPlanned(s.status),
              ).length;
              const blockingFocusCount = blockingFocusSessions.length;
              const canDelete =
                timeBlockCount === 0 && blockingFocusCount === 0;
              const cannotDeleteDetail =
                timeBlockCount > 0
                  ? formatMessage(t.categories.cannotDeleteTimeBlocks, {
                      count: timeBlockCount,
                    })
                  : activeFocusCount > 0
                    ? formatMessage(t.categories.cannotDeleteActiveFocus, {
                        count: activeFocusCount,
                      })
                    : blockingFocusCount > 0
                      ? formatMessage(
                          t.categories.cannotDeleteCompletedFocus,
                          { count: blockingFocusCount },
                        )
                      : null;

              return (
                <CategoryRow
                  key={category.id}
                  category={{
                    id: category.id,
                    name: category.name,
                    color: category.color,
                    description: category.description,
                    timeBlockCount,
                    focusSessionCount,
                  }}
                  otherCategories={categories
                    .filter((item) => item.id !== category.id)
                    .map((item) => ({ id: item.id, name: item.name }))}
                  labels={{
                    name: t.categories.name,
                    color: t.categories.color,
                    descriptionOptional: t.categories.descriptionOptional,
                    timeBlockCountFormatted,
                    focusSessionCountFormatted: formatMessage(
                      t.categories.focusSessionCount,
                      { count: focusSessionCount },
                    ),
                    cannotDeleteFormatted: canDelete
                      ? null
                      : cannotDeleteDetail ?? t.categories.cannotDeleteRecords,
                    confirmDelete: formatMessage(t.categories.confirmDelete, {
                      name: category.name,
                    }),
                    confirmDeleteTitle: t.common.confirmDeleteTitle,
                    edit: t.common.edit,
                    save: t.common.save,
                    cancel: t.common.cancel,
                    delete: t.common.delete,
                    submitting: t.common.submitting,
                    showTimeBlocks: t.categories.timeBlockList.show,
                    hideTimeBlocks: t.categories.timeBlockList.hide,
                    timeBlocksHeading: t.categories.timeBlockList.heading,
                    timeBlocksEmpty: t.categories.timeBlockList.empty,
                    timeBlocksShowingCount:
                      t.categories.timeBlockList.showingCount,
                    timeBlocksLoadMore: t.categories.timeBlockList.loadMore,
                    timeBlocksLoadingMore:
                      t.categories.timeBlockList.loadingMore,
                    timeBlocksLoading: t.categories.timeBlockList.loading,
                    timeBlocksLoadFailed: t.categories.timeBlockList.loadFailed,
                    timeBlocksRetry: t.categories.timeBlockList.retry,
                    timeBlocksBulkSelectionLimit:
                      t.categories.timeBlockList.bulkSelectionLimit,
                    timeBlocksSelectedCount:
                      t.categories.timeBlockList.selectedCount,
                    timeBlocksSelectVisible:
                      t.categories.timeBlockList.selectVisible,
                    timeBlocksDeselectVisible:
                      t.categories.timeBlockList.deselectVisible,
                    timeBlocksClearSelection:
                      t.categories.timeBlockList.clearSelection,
                    timeBlocksMoveSelected:
                      t.categories.timeBlockList.moveSelected,
                    timeBlocksMoveTitle: t.categories.timeBlockList.moveTitle,
                    timeBlocksMoveTargetCategory:
                      t.categories.timeBlockList.moveTargetCategory,
                    timeBlocksMoveSelectTarget:
                      t.categories.timeBlockList.moveSelectTarget,
                    timeBlocksMoveDescription:
                      t.categories.timeBlockList.moveDescription,
                    timeBlocksMoveConfirm:
                      t.categories.timeBlockList.moveConfirm,
                    timeBlocksMoving: t.categories.timeBlockList.moving,
                    timeBlocksMoveSuccess:
                      t.categories.timeBlockList.moveSuccess,
                    timeBlocksMoveFailed:
                      t.categories.timeBlockList.moveFailed,
                    timeBlocksNoOtherCategories:
                      t.categories.timeBlockList.noOtherCategories,
                    timeBlocksDeleteSelected:
                      t.categories.timeBlockList.deleteSelected,
                    timeBlocksDeleteTitle:
                      t.categories.timeBlockList.deleteTitle,
                    timeBlocksDeleteDescription:
                      t.categories.timeBlockList.deleteDescription,
                    timeBlocksDeleteConfirm:
                      t.categories.timeBlockList.deleteConfirm,
                    timeBlocksDeleting: t.categories.timeBlockList.deleting,
                    timeBlocksDeleteSuccess:
                      t.categories.timeBlockList.deleteSuccess,
                    timeBlocksDeleteFailed:
                      t.categories.timeBlockList.deleteFailed,
                  }}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

import { CategoryRow } from "@/components/category-row";
import { CategoryEmptyState } from "@/components/categories/category-empty-state";
import { CategoryFormCard } from "@/components/categories/category-form-card";
import { CategoryPageHeader } from "@/components/categories/category-page-header";
import { PageFeedback } from "@/components/page-feedback";
import { createCategory } from "@/lib/actions/categories";
import { formatMessage, getDictionary } from "@/lib/i18n";
import { categoriesForUser } from "@/lib/db/scoped";
import {
  isFocusSessionPlanned,
  isFocusSessionRunning,
} from "@/lib/focus-session-status";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";

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
                  labels={{
                    name: t.categories.name,
                    color: t.categories.color,
                    descriptionOptional: t.categories.descriptionOptional,
                    timeBlockCountFormatted: formatMessage(
                      t.categories.timeBlockCount,
                      { count: timeBlockCount },
                    ),
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

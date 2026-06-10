import Link from "next/link";
import { TimeBlockForm } from "@/components/time-block-form";
import { TimeBlockRow } from "@/components/time-block-row";
import { TimeBlockEmptyState } from "@/components/time-blocks/time-block-empty-state";
import { TimeBlockPageHeader } from "@/components/time-blocks/time-block-page-header";
import { PageFeedback } from "@/components/page-feedback";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createTimeBlock } from "@/lib/actions/time-blocks";
import { TIME_BLOCK_STATUSES } from "@/lib/constants";
import {
  formatMessage,
  getDictionary,
  getStatusLabel,
  type Dictionary,
} from "@/lib/i18n";
import { categoriesForUser, timeBlocksForUser } from "@/lib/db/scoped";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";
import {
  durationMinutes,
  formatDateTimeInTimeZone,
} from "@/lib/time";

export const dynamic = "force-dynamic";

const TIME_BLOCK_ERROR_MAP = {
  missing_fields: "missingFields",
  invalid_range: "invalidRange",
  invalid_status: "invalidStatus",
  invalid_completion: "invalidCompletion",
  update_failed: "updateFailed",
  delete_failed: "deleteFailed",
} as const;

type TimeBlockErrorParam = keyof typeof TIME_BLOCK_ERROR_MAP;

function resolveTimeBlockError(
  error: string | undefined,
  t: Dictionary,
): string | null {
  if (!error || !(error in TIME_BLOCK_ERROR_MAP)) return null;
  const key = TIME_BLOCK_ERROR_MAP[error as TimeBlockErrorParam];
  return t.timeBlocks.errors[key];
}

function resolveTimeBlockSuccess(
  success: string | undefined,
  t: Dictionary,
): string | null {
  if (success === "created") return t.timeBlocks.success.created;
  if (success === "updated") return t.timeBlocks.success.updated;
  if (success === "deleted") return t.timeBlocks.success.deleted;
  return null;
}

function formatDateInTimeZone(
  date: Date,
  timeZone: string,
  locale: "zh" | "en",
): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeZone,
  }).format(date);
}

export default async function TimeBlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { success, error } = await searchParams;

  const successMessage = resolveTimeBlockSuccess(success, t);
  const errorMessage = resolveTimeBlockError(error, t);
  const user = await requireUser();
  const userTimeZone = await getUserCalendarTimeZone();

  const [timeBlocks, categories] = await Promise.all([
    timeBlocksForUser(user.id, {
      include: { category: true },
      orderBy: { startTime: "desc" },
    }),
    categoriesForUser(user.id, { orderBy: { name: "asc" } }),
  ]);

  const statusOptions = TIME_BLOCK_STATUSES.map((s) => ({
    value: s,
    label: getStatusLabel(s, locale),
  }));

  const efficiencyOptions = [
    { value: "low", label: locale === "zh" ? "低" : "Low" },
    { value: "medium", label: locale === "zh" ? "中" : "Medium" },
    { value: "high", label: locale === "zh" ? "高" : "High" },
  ];

  const createFormKey = success === "created" ? "created" : "default";

  const formLabels = {
    titleLabel: t.timeBlocks.titleLabel,
    titlePlaceholder: t.timeBlocks.titlePlaceholder,
    category: t.timeBlocks.category,
    selectCategory: t.timeBlocks.selectCategory,
    startTime: t.timeBlocks.startTime,
    endTime: t.timeBlocks.endTime,
    noteOptional: t.timeBlocks.noteOptional,
    notePlaceholder: t.timeBlocks.notePlaceholder,
    status: t.timeBlocks.status,
    efficiencyOptional: t.timeBlocks.efficiencyOptional,
    selectEfficiency: t.timeBlocks.selectEfficiency,
    reviewNoteOptional: t.timeBlocks.reviewNoteOptional,
    reviewNotePlaceholder: t.timeBlocks.reviewNotePlaceholder,
    save: t.common.save,
    cancel: t.common.cancel,
    submitting: t.common.submitting,
  };

  return (
    <div className="space-y-6">
      <TimeBlockPageHeader
        labels={{
          title: t.timeBlocks.title,
          pageDescription: t.timeBlocks.pageDescription,
        }}
      />

      <PageFeedback
        successMessage={successMessage}
        errorMessage={errorMessage}
        errorTitle={t.common.errorTitle}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.timeBlocks.newTimeBlock}</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.timeBlocks.needCategoryPrefix}{" "}
              <Link href="/categories" className="text-primary underline-offset-4 hover:underline">
                {t.timeBlocks.categoriesLink}
              </Link>{" "}
              {t.timeBlocks.needCategorySuffix}
            </p>
          ) : (
            <TimeBlockForm
              key={createFormKey}
              formId="time-block-create-form"
              action={createTimeBlock}
              mode="create"
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              statusOptions={statusOptions}
              efficiencyOptions={efficiencyOptions}
              userTimeZone={userTimeZone}
              labels={formLabels}
              showEfficiencyAndReview
              submitVariant="primary"
              submitLabel={t.common.create}
            />
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t.timeBlocks.allTimeBlocks}</h2>
        {timeBlocks.length === 0 ? (
          <TimeBlockEmptyState
            labels={{
              empty: t.timeBlocks.empty,
              emptyHint: t.timeBlocks.emptyHint,
              goToCalendar: t.timeBlocks.goToCalendar,
              goToFocusStopwatch: t.timeBlocks.goToFocusStopwatch,
            }}
          />
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.timeBlocks.cannotEditNoCategories}
          </p>
        ) : (
          <div className="space-y-3">
            {timeBlocks.map((block) => {
              const minutes = durationMinutes(block.startTime, block.endTime);

              return (
                <TimeBlockRow
                  key={block.id}
                  block={{
                    id: block.id,
                    title: block.title,
                    note: block.note,
                    reviewNote: block.reviewNote,
                    categoryId: block.categoryId,
                    status: block.status,
                    completionLevel: block.completionLevel,
                    efficiencyLevel: block.efficiencyLevel,
                    startTime: block.startTime,
                    endTime: block.endTime,
                    category: block.category,
                  }}
                  categories={categories.map((c) => ({
                    id: c.id,
                    name: c.name,
                  }))}
                  statusOptions={statusOptions}
                  efficiencyOptions={efficiencyOptions}
                  userTimeZone={userTimeZone}
                  locale={locale}
                  labels={{
                    ...formLabels,
                    durationFormatted: `${minutes} ${t.timeBlocks.minutesUnit}`,
                    dateFormatted: formatDateInTimeZone(
                      block.startTime,
                      userTimeZone,
                      locale,
                    ),
                    completion: t.timeBlocks.completion,
                    startFormatted: formatDateTimeInTimeZone(
                      block.startTime,
                      userTimeZone,
                      locale,
                    ),
                    endFormatted: formatDateTimeInTimeZone(
                      block.endTime,
                      userTimeZone,
                      locale,
                    ),
                    confirmDelete: formatMessage(t.timeBlocks.confirmDelete, {
                      title: block.title,
                    }),
                    confirmDeleteTitle: t.common.confirmDeleteTitle,
                    edit: t.common.edit,
                    cancel: t.common.cancel,
                    delete: t.common.delete,
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

import Link from "next/link";
import { TimeBlockForm } from "@/components/time-block-form";
import { TimeBlockRow } from "@/components/time-block-row";
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t.timeBlocks.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t.timeBlocks.subtitle}</p>
      </div>

      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">{t.timeBlocks.newTimeBlock}</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-amber-700">
            {t.timeBlocks.needCategoryPrefix}{" "}
            <Link href="/categories" className="underline">
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
            labels={{
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
              submitting: t.common.submitting,
            }}
            showEfficiencyAndReview
            submitVariant="primary"
            submitLabel={t.common.create}
          />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t.timeBlocks.allTimeBlocks}</h2>
        {timeBlocks.length === 0 ? (
          <p className="text-sm text-zinc-500">{t.timeBlocks.empty}</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-amber-700">
            {t.timeBlocks.cannotEditNoCategories}
          </p>
        ) : (
          <ul className="space-y-4">
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
                  labels={{
                    titleLabel: t.timeBlocks.titleLabel,
                    category: t.timeBlocks.category,
                    startTime: t.timeBlocks.startTime,
                    endTime: t.timeBlocks.endTime,
                    noteOptional: t.timeBlocks.noteOptional,
                    status: t.timeBlocks.status,
                    efficiencyOptional: t.timeBlocks.efficiencyOptional,
                    selectEfficiency: t.timeBlocks.selectEfficiency,
                    reviewNoteOptional: t.timeBlocks.reviewNoteOptional,
                    durationFormatted: `${minutes} ${t.timeBlocks.minutesUnit}`,
                    statusCompletionFormatted: getStatusLabel(block.status, locale),
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
                    edit: t.common.edit,
                    save: t.common.save,
                    cancel: t.common.cancel,
                    delete: t.common.delete,
                    submitting: t.common.submitting,
                  }}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

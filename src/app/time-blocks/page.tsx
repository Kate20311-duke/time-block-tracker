import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { TimeBlockDatetimeFields } from "@/components/time-block-datetime-fields";
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
          <form
            id="time-block-create-form"
            key={createFormKey}
            action={createTimeBlock}
            className="grid gap-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">{t.timeBlocks.titleLabel}</span>
              <input
                name="title"
                required
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder={t.timeBlocks.titlePlaceholder}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t.timeBlocks.category}</span>
              <select
                name="categoryId"
                required
                className="rounded border border-zinc-300 px-3 py-2"
              >
                <option value="">{t.timeBlocks.selectCategory}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t.timeBlocks.status}</span>
              <select
                name="status"
                defaultValue="planned"
                required
                className="rounded border border-zinc-300 px-3 py-2"
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <TimeBlockDatetimeFields
              formId="time-block-create-form"
              startLabel={t.timeBlocks.startTime}
              endLabel={t.timeBlocks.endTime}
              timeZone={userTimeZone}
            />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t.timeBlocks.completionRange}</span>
              <input
                name="completionLevel"
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={0}
                required
                className="rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t.timeBlocks.efficiencyOptional}</span>
              <select
                name="efficiencyLevel"
                defaultValue=""
                className="rounded border border-zinc-300 px-3 py-2"
              >
                <option value="">{t.timeBlocks.selectEfficiency}</option>
                {efficiencyOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">{t.timeBlocks.noteOptional}</span>
              <textarea
                name="note"
                rows={2}
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder={t.timeBlocks.notePlaceholder}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">{t.timeBlocks.reviewNoteOptional}</span>
              <textarea
                name="reviewNote"
                rows={2}
                className="rounded border border-zinc-300 px-3 py-2"
                placeholder={t.timeBlocks.reviewNotePlaceholder}
              />
            </label>
            <div className="sm:col-span-2">
              <SubmitButton
                label={t.common.create}
                pendingLabel={t.common.submitting}
              />
            </div>
          </form>
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
                    completionRange: t.timeBlocks.completionRange,
                    efficiencyOptional: t.timeBlocks.efficiencyOptional,
                    selectEfficiency: t.timeBlocks.selectEfficiency,
                    reviewNoteOptional: t.timeBlocks.reviewNoteOptional,
                    durationFormatted: `${minutes} ${t.timeBlocks.minutesUnit}`,
                    statusCompletionFormatted: `${getStatusLabel(block.status, locale)} · ${block.completionLevel}%`,
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

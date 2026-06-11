import { RoutineEmptyState } from "@/components/routines/routine-empty-state";
import { RoutineFormCard } from "@/components/routines/routine-form-card";
import { RoutineGenerateCard } from "@/components/routines/routine-generate-card";
import { RoutinePageHeader } from "@/components/routines/routine-page-header";
import { RoutineRow } from "@/components/routines/routine-row";
import { PageFeedback } from "@/components/page-feedback";
import { getDayQueryRange } from "@/lib/calendar";
import { createRoutine } from "@/lib/actions/routines";
import { categoriesForUser, routinesForUser, timeBlocksForUser } from "@/lib/db/scoped";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { todayDateInputValue, toDateInputValue } from "@/lib/routines/routine-format";
import { resolvePresetRange } from "@/lib/routines/routine-generate-range";
import { estimateRoutineGeneratedStatus } from "@/lib/routines/routine-generated-status";
import type { RoutineValidationError } from "@/lib/routines/routine-types";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

function routineErrorMessage(
  error: string | undefined,
  t: ReturnType<typeof getDictionary>,
): string | null {
  const map: Record<RoutineValidationError | "invalid_category", string> = {
    empty_title: t.routines.errors.emptyTitle,
    title_too_long: t.routines.errors.titleTooLong,
    missing_category: t.routines.errors.missingCategory,
    invalid_time_format: t.routines.errors.invalidTimeFormat,
    invalid_time_range: t.routines.errors.invalidTimeRange,
    empty_days: t.routines.errors.emptyDays,
    invalid_days: t.routines.errors.invalidDays,
    invalid_start_date: t.routines.errors.invalidStartDate,
    invalid_date_range: t.routines.errors.invalidDateRange,
    invalid_category: t.routines.errors.invalidCategory,
  };

  if (!error || !(error in map)) {
    return null;
  }

  return map[error as keyof typeof map];
}

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { success, error } = await searchParams;
  const user = await requireUser();
  const userTimeZone = await getUserCalendarTimeZone();

  const nextSevenRange = resolvePresetRange("next7", userTimeZone);

  const [routines, categories, upcomingBlocks] = await Promise.all([
    routinesForUser(user.id, {
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: { category: { select: { name: true, color: true } } },
    }),
    categoriesForUser(user.id, {
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    (async () => {
      const { dayStart } = getDayQueryRange(nextSevenRange.startDate, userTimeZone);
      const { dayEnd } = getDayQueryRange(nextSevenRange.endDate, userTimeZone);
      return timeBlocksForUser(user.id, {
        where: {
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: {
          title: true,
          startTime: true,
          endTime: true,
        },
      });
    })(),
  ]);

  const existingBlocksForStatus = upcomingBlocks.map((block) => ({
    title: block.title,
    startTime: block.startTime,
    endTime: block.endTime,
  }));

  const successMessage =
    success === "created"
      ? t.routines.success.created
      : success === "updated"
        ? t.routines.success.updated
        : success === "deleted"
          ? t.routines.success.deleted
          : success === "activated"
            ? t.routines.success.activated
            : success === "deactivated"
              ? t.routines.success.deactivated
              : null;

  const errorMessage = routineErrorMessage(error, t);
  const createFormKey = success === "created" ? "created" : "default";
  const defaultStartDate = todayDateInputValue();

  const generateRoutines = routines.map((routine) => ({
    id: routine.id,
    title: routine.title,
    categoryId: routine.categoryId,
    categoryName: routine.category?.name ?? null,
    startTime: routine.startTime,
    endTime: routine.endTime,
    daysOfWeek: routine.daysOfWeek,
    startDate: toDateInputValue(routine.startDate),
    endDate: routine.endDate ? toDateInputValue(routine.endDate) : null,
    isActive: routine.isActive,
  }));

  const formLabels = {
    heading: t.routines.createRoutine,
    submit: t.common.create,
    submitting: t.common.submitting,
    title: t.routines.titleLabel,
    titlePlaceholder: t.routines.titlePlaceholder,
    category: t.routines.category,
    categoryHint: t.routines.categoryHint,
    selectCategory: t.routines.selectCategory,
    noCategoriesHint: t.routines.noCategoriesHint,
    goCreateCategory: t.routines.goCreateCategory,
    startTime: t.routines.startTime,
    endTime: t.routines.endTime,
    repeatDays: t.routines.repeatDays,
    weekdays: t.routines.weekdays,
    everyday: t.routines.everyday,
    clear: t.routines.clear,
    startDate: t.routines.startDate,
    endDate: t.routines.endDate,
    notes: t.routines.notes,
    notesPlaceholder: t.routines.notesPlaceholder,
  };

  const rowLabels = {
    edit: t.common.edit,
    save: t.routines.saveChanges,
    cancel: t.routines.cancelEdit,
    delete: t.common.delete,
    submitting: t.common.submitting,
    confirmDelete: t.routines.confirmDelete,
    confirmDeleteTitle: t.common.confirmDeleteTitle,
    activate: t.routines.activate,
    deactivate: t.routines.deactivate,
    active: t.routines.active,
    inactive: t.routines.inactive,
    noCategory: t.routines.noCategory,
    missingCategoryBadge: t.routines.missingCategoryBadge,
    noEndDate: t.routines.noEndDate,
    startLabel: t.routines.startLabel,
    statusLabel: t.routines.statusLabel,
    notesLabel: t.routines.notesLabel,
    editHeading: t.routines.editRoutine,
    title: t.routines.titleLabel,
    titlePlaceholder: t.routines.titlePlaceholder,
    category: t.routines.category,
    categoryHint: t.routines.categoryHint,
    selectCategory: t.routines.selectCategory,
    startTime: t.routines.startTime,
    endTime: t.routines.endTime,
    repeatDays: t.routines.repeatDays,
    weekdays: t.routines.weekdays,
    everyday: t.routines.everyday,
    clear: t.routines.clear,
    startDate: t.routines.startDate,
    endDate: t.routines.endDate,
    notes: t.routines.notes,
    notesPlaceholder: t.routines.notesPlaceholder,
    generatedStatusAll: t.routines.generatedStatusAll,
    generatedStatusNone: t.routines.generatedStatusNone,
    generatedStatusPartial: t.routines.generatedStatusPartial,
    generatedStatusNoDates: t.routines.generatedStatusNoDates,
    generatedStatusNote: t.routines.generatedStatusNote,
  };

  return (
    <div className="space-y-6">
      <RoutinePageHeader
        labels={{
          title: t.routines.title,
          pageDescription: t.routines.pageDescription,
        }}
      />

      <PageFeedback
        successMessage={successMessage}
        errorMessage={errorMessage}
        errorTitle={t.common.errorTitle}
      />

      <RoutineGenerateCard
        locale={locale}
        timeZone={userTimeZone}
        routines={generateRoutines}
        labels={t.routines.generate}
        weekdayLabels={{
          weekdays: t.routines.weekdays,
          everyday: t.routines.everyday,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <RoutineFormCard
          formKey={createFormKey}
          locale={locale}
          categories={categories}
          action={createRoutine}
          labels={formLabels}
          defaultStartDate={defaultStartDate}
        />

        <section className="space-y-4">
          <h2 className="text-base font-semibold">{t.routines.allRoutines}</h2>
          {routines.length === 0 ? (
            <RoutineEmptyState
              labels={{
                empty: t.routines.empty,
                emptyHint: t.routines.emptyHint,
              }}
            />
          ) : (
            <div className="space-y-3">
              {routines.map((routine) => {
                const routineListItem = {
                  id: routine.id,
                  title: routine.title,
                  categoryId: routine.categoryId,
                  categoryName: routine.category?.name ?? null,
                  startTime: routine.startTime,
                  endTime: routine.endTime,
                  daysOfWeek: routine.daysOfWeek,
                  startDate: toDateInputValue(routine.startDate),
                  endDate: routine.endDate
                    ? toDateInputValue(routine.endDate)
                    : null,
                  isActive: routine.isActive,
                };
                const generatedStatus = routine.isActive
                  ? estimateRoutineGeneratedStatus({
                      routine: routineListItem,
                      existingBlocks: existingBlocksForStatus,
                      startDate: nextSevenRange.startDate,
                      endDate: nextSevenRange.endDate,
                      timeZone: userTimeZone,
                    })
                  : null;

                return (
                  <RoutineRow
                    key={routine.id}
                    locale={locale}
                    categories={categories}
                    routine={{
                      id: routine.id,
                      title: routine.title,
                      categoryId: routine.categoryId,
                      categoryName: routine.category?.name ?? null,
                      categoryColor: routine.category?.color ?? null,
                      startTime: routine.startTime,
                      endTime: routine.endTime,
                      daysOfWeek: routine.daysOfWeek,
                      startDate: routineListItem.startDate,
                      endDate: routineListItem.endDate,
                      isActive: routine.isActive,
                      notes: routine.notes,
                    }}
                    generatedStatus={generatedStatus}
                    labels={rowLabels}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { GoalEmptyState } from "@/components/goals/goal-empty-state";
import { GoalsCreateSection } from "@/components/goals/goals-create-section";
import { GoalFilterTabs } from "@/components/goals/goal-filter-tabs";
import { GoalRow } from "@/components/goals/goal-row";
import { PageFeedback } from "@/components/page-feedback";
import {
  createGoal,
  deactivateGoal,
  deleteGoal,
  loadGoalsPageData,
  updateGoal,
} from "@/lib/actions/goals";
import { formatCalendarDateParamInTimeZone } from "@/lib/calendar-timezone";
import { categoriesForUser } from "@/lib/db/scoped";
import { buildGoalDetailHref } from "@/lib/goals-detail";
import { GOAL_TEMPLATES } from "@/lib/goal-templates";
import { formatGoalProgressValue, goalTargetToFormInput } from "@/lib/goals-metric-display";
import {
  matchesGoalListFilter,
  parseGoalListFilter,
  type GoalValidationError,
} from "@/lib/goals";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { todayDateInputValueInTimeZone } from "@/lib/routines/routine-format";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

function goalErrorMessage(
  error: string | undefined,
  t: ReturnType<typeof getDictionary>,
): string | null {
  const map: Record<GoalValidationError | "invalid_category", string> = {
    empty_title: t.goals.errors.emptyTitle,
    title_too_long: t.goals.errors.titleTooLong,
    invalid_target_minutes: t.goals.errors.invalidTargetMinutes,
    invalid_metric: t.goals.errors.invalidMetric,
    invalid_goal_type: t.goals.errors.invalidGoalType,
    invalid_period: t.goals.errors.invalidPeriod,
    invalid_type_period_combo: t.goals.errors.invalidTypePeriodCombo,
    missing_end_date: t.goals.errors.missingEndDate,
    invalid_start_date: t.goals.errors.invalidStartDate,
    invalid_date_range: t.goals.errors.invalidDateRange,
    invalid_category: t.goals.errors.invalidCategory,
  };

  if (!error || !(error in map)) return null;
  return map[error as keyof typeof map];
}

function formatPeriodLabel(
  periodStart: Date,
  periodEnd: Date,
  period: string,
  locale: "zh" | "en",
  timeZone: string,
): string {
  const formatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  });
  if (period === "weekly") {
    const weekEndDisplay = new Date(periodEnd.getTime() - 1);
    return `${formatter.format(periodStart)} – ${formatter.format(weekEndDisplay)}`;
  }
  if (period === "daily") {
    return formatter.format(periodStart);
  }
  const endDisplay = new Date(periodEnd.getTime() - 1);
  return `${formatter.format(periodStart)} – ${formatter.format(endDisplay)}`;
}

function resolveGoalTemplates(
  locale: "zh" | "en",
  t: ReturnType<typeof getDictionary>,
) {
  return GOAL_TEMPLATES.map((template) => {
    const item = t.goals.templates.items[template.id];
    const metricLabel =
      template.metric === "completed_blocks_count"
        ? t.goals.metrics.completedBlocksCount
        : template.metric === "focus_minutes"
          ? t.goals.metrics.focusMinutes
          : template.metric === "focus_sessions_count"
            ? t.goals.metrics.focusSessionsCount
            : t.goals.metrics.timeBlockMinutes;
    const periodLabel =
      template.period === "daily" ? t.goals.periodDaily : t.goals.periodWeekly;

    return {
      ...template,
      title: item.title,
      description: item.description,
      targetLabel: formatGoalProgressValue(
        template.metric,
        template.targetMinutes,
        locale,
      ),
      metricLabel,
      periodLabel,
    };
  });
}

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; filter?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { success, error, filter: filterParam } = await searchParams;
  const filter = parseGoalListFilter(filterParam);
  const user = await requireUser();
  const userTimeZone = await getUserCalendarTimeZone();

  const [categories, pageData] = await Promise.all([
    categoriesForUser(user.id, {
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    loadGoalsPageData(user.id, userTimeZone),
  ]);

  const filteredEntries = pageData.entries.filter((entry) =>
    matchesGoalListFilter(
      { goal: entry.goal, periods: entry.goal.goalPeriods },
      filter,
    ),
  );

  const errorMessage = goalErrorMessage(error, t);
  const successMessage =
    success === "created"
      ? t.goals.success.created
      : success === "updated"
        ? t.goals.success.updated
        : success === "deactivated"
          ? t.goals.success.deactivated
          : success === "deleted"
            ? t.goals.success.deleted
            : null;

  const formLabels = {
    title: t.goals.titleLabel,
    titlePlaceholder: t.goals.titlePlaceholder,
    descriptionLabel: t.goals.description,
    descriptionPlaceholder: t.goals.descriptionPlaceholder,
    category: t.goals.category,
    categoryHint: t.goals.categoryHint,
    allCategories: t.goals.allCategories,
    noCategoriesHint: t.goals.noCategoriesHint,
    goCreateCategory: t.goals.goCreateCategory,
    targetHours: t.goals.targetHours,
    targetHoursHint: t.goals.targetHoursHint,
    targetCount: t.goals.metrics.targetCount,
    targetCountHint: t.goals.metrics.targetCountHint,
    metric: t.goals.metrics.label,
    metricHint: t.goals.metrics.hint,
    metricSeparateWarning: t.goals.metrics.separateWarning,
    readOnlyMetricHint: t.goals.metrics.readOnlyHint,
    metricTimeBlockMinutes: t.goals.metrics.timeBlockMinutes,
    metricCompletedBlocksCount: t.goals.metrics.completedBlocksCount,
    metricFocusMinutes: t.goals.metrics.focusMinutes,
    metricFocusMinutesHint: t.goals.metrics.focusMinutesHint,
    metricFocusSessionsCount: t.goals.metrics.focusSessionsCount,
    goalType: t.goals.goalType,
    goalTypeOneTime: t.goals.goalTypeOneTime,
    goalTypeRecurring: t.goals.goalTypeRecurring,
    period: t.goals.period,
    periodOnce: t.goals.periodOnce,
    periodDaily: t.goals.periodDaily,
    periodWeekly: t.goals.periodWeekly,
    startDate: t.goals.startDate,
    endDate: t.goals.endDate,
    endDateRequired: t.goals.endDateRequired,
    endDateOptional: t.goals.endDateOptional,
    activeLabel: t.goals.activeLabel,
    readOnlyTypeHint: t.goals.readOnlyTypeHint,
  };

  const rowLabels = {
    progress: t.goals.progress,
    progressOf: t.goals.progressOf,
    progressCount: t.goals.metrics.progressCount,
    currentPeriod: t.goals.currentPeriod,
    streak: t.goals.streak,
    streakCurrent: t.goals.streakCurrent,
    streakLongest: t.goals.streakLongest,
    achievementRate: t.goals.achievementRate,
    achievementRateValue: t.goals.achievementRateValue,
    history: t.goals.history,
    deactivate: t.goals.deactivate,
    inactive: t.goals.inactive,
    edit: t.goals.edit,
    save: t.goals.saveChanges,
    cancel: t.common.cancel,
    editHeading: t.goals.editGoal,
    viewDetails: t.goals.detail.viewDetails,
    confirmDelete: t.goals.confirmDelete,
    confirmDeleteTitle: t.common.confirmDeleteTitle,
    delete: t.common.delete,
    submitting: t.common.submitting,
    allCategories: t.goals.allCategories,
    categoryRemoved: t.goals.categoryRemoved,
    periodDaily: t.goals.periodDaily,
    periodWeekly: t.goals.periodWeekly,
    periodOnce: t.goals.periodOnce,
    status: t.goals.status,
  };

  const hasAnyGoals = pageData.entries.length > 0;
  const defaultStartDate = todayDateInputValueInTimeZone(userTimeZone);
  const resolvedTemplates = resolveGoalTemplates(locale, t);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.goals.title}</h1>
        <p className="text-sm text-muted-foreground">{t.goals.pageDescription}</p>
      </div>

      <PageFeedback successMessage={successMessage} errorMessage={errorMessage} />

      <GoalsCreateSection
        categories={categories}
        defaultStartDate={defaultStartDate}
        locale={locale}
        assistantLabels={t.assistant}
        templates={resolvedTemplates}
        action={createGoal}
        formLabels={{
          heading: t.goals.createGoal,
          description: t.goals.pageDescription,
          submit: t.common.create,
          submitting: t.common.submitting,
          ...formLabels,
        }}
        templateLabels={{
          sectionTitle: t.goals.templates.title,
          sectionDescription: t.goals.templates.description,
          selectedFeedback: t.goals.templates.selectedFeedback,
          useTemplate: t.goals.templates.useTemplate,
          groups: t.goals.templates.groups,
        }}
        aiSuggestionLabels={{
          title: t.goals.aiSuggestions.title,
          description: t.goals.aiSuggestions.description,
          disclaimer: t.goals.aiSuggestions.disclaimer,
          generate: t.goals.aiSuggestions.generate,
          generating: t.goals.aiSuggestions.generating,
          errorFailed: t.goals.aiSuggestions.errorFailed,
          empty: t.goals.aiSuggestions.empty,
          useSuggestion: t.goals.aiSuggestions.useSuggestion,
          selectedFeedback: t.goals.aiSuggestions.selectedFeedback,
          confidenceLow: t.goals.aiSuggestions.confidenceLow,
          confidenceMedium: t.goals.aiSuggestions.confidenceMedium,
          confidenceHigh: t.goals.aiSuggestions.confidenceHigh,
          allCategories: t.goals.allCategories,
          metricTimeBlockMinutes: t.goals.metrics.timeBlockMinutes,
          metricCompletedBlocksCount: t.goals.metrics.completedBlocksCount,
          metricFocusMinutes: t.goals.metrics.focusMinutes,
          metricFocusSessionsCount: t.goals.metrics.focusSessionsCount,
          periodDaily: t.goals.periodDaily,
          periodWeekly: t.goals.periodWeekly,
          periodOnce: t.goals.periodOnce,
        }}
      />

      {hasAnyGoals ? (
        <div className="flex flex-col gap-4">
          <GoalFilterTabs
            current={filter}
            labels={{
              active: t.goals.filters.active,
              history: t.goals.filters.history,
              missed: t.goals.filters.missed,
              inactive: t.goals.filters.inactive,
              all: t.goals.filters.all,
            }}
          />

          {filteredEntries.length > 0 ? (
            <section className="flex flex-col gap-3">
              {filteredEntries.map(({ goal, summary }) => {
                const currentPeriod = summary.currentPeriod;
                const periodLabel = currentPeriod
                  ? formatPeriodLabel(
                      currentPeriod.periodStart,
                      currentPeriod.periodEnd,
                      goal.period,
                      locale,
                      userTimeZone,
                    )
                  : "—";

                return (
                  <GoalRow
                    key={goal.id}
                    locale={locale}
                    title={goal.title}
                    description={goal.description}
                    categoryId={goal.categoryId}
                    category={
                      goal.category
                        ? { name: goal.category.name, color: goal.category.color }
                        : null
                    }
                    summary={summary}
                    historyPeriods={goal.goalPeriods}
                    periodLabel={periodLabel}
                    timeZone={userTimeZone}
                    goalId={goal.id}
                    metric={goal.metric}
                    isActive={goal.isActive}
                    goalType={goal.goalType as "one_time" | "recurring"}
                    period={goal.period as "once" | "daily" | "weekly"}
                    formDefaults={{
                      title: goal.title,
                      description: goal.description,
                      categoryId: goal.categoryId,
                      targetHours: goalTargetToFormInput(goal.metric, goal.targetMinutes),
                      startDate: formatCalendarDateParamInTimeZone(
                        goal.startDate,
                        userTimeZone,
                      ),
                      endDate: goal.endDate
                        ? formatCalendarDateParamInTimeZone(goal.endDate, userTimeZone)
                        : "",
                      goalType: goal.goalType as "one_time" | "recurring",
                      period: goal.period as "once" | "daily" | "weekly",
                      isActive: goal.isActive,
                    }}
                    categories={categories}
                    filter={filter}
                    detailHref={buildGoalDetailHref(goal.id, filter)}
                    updateAction={updateGoal}
                    deactivateAction={deactivateGoal}
                    deleteAction={deleteGoal}
                    formLabels={formLabels}
                    labels={rowLabels}
                  />
                );
              })}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">{t.goals.filterEmpty}</p>
          )}
        </div>
      ) : (
        <GoalEmptyState
          labels={{
            empty: t.goals.empty,
            emptyHint: t.goals.emptyHint,
            goCreateCategory: t.goals.goCreateCategory,
          }}
        />
      )}
    </div>
  );
}

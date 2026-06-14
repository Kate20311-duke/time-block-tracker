import { notFound } from "next/navigation";

import { GoalDetailView } from "@/components/goals/goal-detail-view";
import { loadGoalDetailData, refreshGoalProgress } from "@/lib/actions/goals";
import { parseGoalDetailFromFilter } from "@/lib/goals-detail";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ goalId: string }>;
  searchParams: Promise<{ fromFilter?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const user = await requireUser();
  const userTimeZone = await getUserCalendarTimeZone();
  const { goalId } = await params;
  const { fromFilter } = await searchParams;
  const filter = parseGoalDetailFromFilter(fromFilter);

  const data = await loadGoalDetailData(
    user.id,
    goalId,
    userTimeZone,
    locale,
    filter,
  );

  if (!data) {
    notFound();
  }

  const detailLabels = {
    backToGoals: t.goals.detail.backToGoals,
    currentProgress: t.goals.detail.currentProgress,
    progress: t.goals.progress,
    progressOf: t.goals.progressOf,
    remaining: t.goals.detail.remaining,
    streakSummary: t.goals.detail.streakSummary,
    streakCurrent: t.goals.streakCurrent,
    streakLongest: t.goals.streakLongest,
    achievedPeriods: t.goals.detail.achievedPeriods,
    evaluatedPeriods: t.goals.detail.evaluatedPeriods,
    achievementRate: t.goals.achievementRate,
    achievementRateValue: t.goals.achievementRateValue,
    historyTitle: t.goals.detail.historyTitle,
    historyEmpty: t.goals.detail.historyEmpty,
    trendTitle: t.goals.detail.trendTitle,
    refreshProgress: t.goals.detail.refreshProgress,
    goalType: t.goals.goalType,
    goalTypeOneTime: t.goals.goalTypeOneTime,
    goalTypeRecurring: t.goals.goalTypeRecurring,
    periodKind: t.goals.period,
    periodOnce: t.goals.periodOnce,
    periodDaily: t.goals.periodDaily,
    periodWeekly: t.goals.periodWeekly,
    overallStatus: t.goals.detail.overallStatus,
    statusActive: t.goals.status.active,
    statusAchieved: t.goals.status.achieved,
    statusMissed: t.goals.status.missed,
    statusInactive: t.goals.inactive,
    allCategories: t.goals.allCategories,
    categoryRemoved: t.goals.categoryRemoved,
    evaluatedAt: t.goals.detail.evaluatedAt,
    submitting: t.common.submitting,
    periodStatus: t.goals.status,
  };

  return (
    <GoalDetailView
      data={data}
      locale={locale}
      timeZone={userTimeZone}
      fromFilter={filter}
      refreshAction={refreshGoalProgress}
      labels={detailLabels}
    />
  );
}

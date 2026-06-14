import { formatCalendarDateParamInTimeZone } from "@/lib/calendar-timezone";
import type { Locale } from "@/lib/i18n/types";
import {
  getDisplayGoalPeriod,
  type GoalLike,
  type GoalListFilter,
  type GoalPeriodLike,
  parseGoalListFilter,
} from "@/lib/goals";

export const GOAL_HISTORY_DAILY_BAR_LIMIT = 14;
export const GOAL_HISTORY_WEEKLY_BAR_LIMIT = 12;

export type GoalOverallStatus = "active" | "achieved" | "missed" | "inactive";

export type GoalHistoryBar = {
  key: string;
  label: string;
  actualMinutes: number;
  targetMinutes: number;
  status: string;
  progressPercent: number;
};

export type GoalDetailProgress = {
  actualMinutes: number;
  targetMinutes: number;
  progressPercent: number;
  remainingMinutes: number | null;
  periodLabel: string;
};

/** Overall goal status for detail header badge. */
export function deriveGoalOverallStatus(
  goal: Pick<GoalLike, "isActive">,
  displayPeriod: GoalPeriodLike | null,
): GoalOverallStatus {
  if (!goal.isActive) return "inactive";
  if (!displayPeriod) return "active";
  if (displayPeriod.status === "achieved") return "achieved";
  if (displayPeriod.status === "missed") return "missed";
  return "active";
}

/** History list: newest first. */
export function orderGoalPeriodsForHistory(
  periods: readonly GoalPeriodLike[],
): GoalPeriodLike[] {
  return [...periods].sort(
    (a, b) => b.periodStart.getTime() - a.periodStart.getTime(),
  );
}

/** Recent periods for trend bars (oldest → newest for left-to-right chart). */
export function selectPeriodsForHistoryChart(
  periods: readonly GoalPeriodLike[],
  periodKind: string,
): GoalPeriodLike[] {
  const limit =
    periodKind === "daily"
      ? GOAL_HISTORY_DAILY_BAR_LIMIT
      : periodKind === "weekly"
        ? GOAL_HISTORY_WEEKLY_BAR_LIMIT
        : 0;
  if (limit <= 0) return [];

  const sorted = orderGoalPeriodsForHistory(periods);
  const recent = sorted.slice(0, limit);
  return [...recent].sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
  );
}

export function formatAchievementRatePercent(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round(rate * 100);
}

export function computeRemainingMinutes(
  actualMinutes: number,
  targetMinutes: number,
  periodStatus: string,
): number | null {
  if (periodStatus !== "active") return null;
  if (targetMinutes <= 0) return null;
  return Math.max(0, targetMinutes - actualMinutes);
}

export function formatPeriodRangeLabel(
  periodStart: Date,
  periodEnd: Date,
  periodKind: string,
  locale: Locale,
  timeZone: string,
): string {
  const formatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  });
  if (periodKind === "weekly") {
    const weekEndDisplay = new Date(periodEnd.getTime() - 1);
    return `${formatter.format(periodStart)} – ${formatter.format(weekEndDisplay)}`;
  }
  if (periodKind === "daily") {
    return formatter.format(periodStart);
  }
  const endDisplay = new Date(periodEnd.getTime() - 1);
  return `${formatter.format(periodStart)} – ${formatter.format(endDisplay)}`;
}

export function buildGoalHistoryBars(
  periods: readonly GoalPeriodLike[],
  periodKind: string,
  locale: Locale,
  timeZone: string,
): GoalHistoryBar[] {
  const selected = selectPeriodsForHistoryChart(periods, periodKind);
  return selected.map((period) => {
    const progressPercent =
      period.targetMinutes > 0
        ? Math.min(100, Math.round((period.actualMinutes / period.targetMinutes) * 100))
        : 0;
    const label =
      periodKind === "daily"
        ? formatCalendarDateParamInTimeZone(period.periodStart, timeZone).slice(5)
        : formatPeriodRangeLabel(period.periodStart, period.periodEnd, periodKind, locale, timeZone);

    return {
      key: period.periodStart.toISOString(),
      label,
      actualMinutes: period.actualMinutes,
      targetMinutes: period.targetMinutes,
      status: period.status,
      progressPercent,
    };
  });
}

export function buildGoalDetailProgress(
  goal: Pick<GoalLike, "targetMinutes" | "period">,
  displayPeriod: GoalPeriodLike | null,
  locale: Locale,
  timeZone: string,
): GoalDetailProgress {
  const actualMinutes = displayPeriod?.actualMinutes ?? 0;
  const targetMinutes = displayPeriod?.targetMinutes ?? goal.targetMinutes;
  const progressPercent =
    targetMinutes > 0
      ? Math.min(100, Math.round((actualMinutes / targetMinutes) * 100))
      : 0;
  const remainingMinutes = computeRemainingMinutes(
    actualMinutes,
    targetMinutes,
    displayPeriod?.status ?? "active",
  );
  const periodLabel = displayPeriod
    ? formatPeriodRangeLabel(
        displayPeriod.periodStart,
        displayPeriod.periodEnd,
        goal.period,
        locale,
        timeZone,
      )
    : "—";

  return {
    actualMinutes,
    targetMinutes,
    progressPercent,
    remainingMinutes,
    periodLabel,
  };
}

export function buildGoalsListHref(filter?: string | null): string {
  const parsed = parseGoalListFilter(filter ?? null);
  return parsed === "active" ? "/goals" : `/goals?filter=${parsed}`;
}

export function buildGoalDetailHref(goalId: string, filter?: string | null): string {
  const parsed = parseGoalListFilter(filter ?? null);
  if (parsed === "active") return `/goals/${goalId}`;
  return `/goals/${goalId}?fromFilter=${parsed}`;
}

export function parseGoalDetailFromFilter(
  value: string | undefined | null,
): GoalListFilter {
  return parseGoalListFilter(value);
}

export function getDisplayPeriodForDetail(
  periods: readonly GoalPeriodLike[],
): GoalPeriodLike | null {
  return getDisplayGoalPeriod(periods);
}

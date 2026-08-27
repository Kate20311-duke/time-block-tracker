import {
  addCalendarDays,
  endOfDay,
  endOfWeekMonday,
  startOfDay,
  startOfWeekMonday,
} from "@/lib/calendar";
import {
  formatCalendarDateParamInTimeZone,
  zonedStartOfCalendarDay,
} from "@/lib/calendar-timezone";
import {
  GOAL_METRICS,
  GOAL_PERIOD_STATUSES,
  GOAL_PERIODS,
  GOAL_TYPES,
  type GoalMetric,
  type GoalPeriodKind,
  type GoalPeriodStatus,
  type GoalType,
} from "@/lib/constants";
import { focusSessionDisplayMinutes } from "@/lib/focus";
import { isGoalCountMetric } from "@/lib/goals-metric-display";
import { overlapMinutes } from "@/lib/stats";
import { isNonEmptyTrimmed } from "@/lib/validation";

const GOAL_DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type GoalLike = {
  id: string;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  metric: string;
  targetMinutes: number;
  goalType: string;
  period: string;
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean;
};

export type GoalPeriodLike = {
  id?: string;
  goalId?: string;
  periodStart: Date;
  periodEnd: Date;
  targetMinutes: number;
  actualMinutes: number;
  status: string;
  evaluatedAt?: Date | null;
};

export type GoalTimeBlockLike = {
  startTime: Date;
  endTime: Date;
  categoryId: string;
  status: string | null;
  completionLevel?: number | null;
};

export type GoalFocusSessionLike = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  status: string;
  categoryId: string | null;
  actualDurationMinutes: number | null;
  plannedDurationMinutes: number;
};

export type GoalFocusSegmentLike = {
  focusSessionId: string;
  startTime: Date;
  durationMinutes: number | null;
  categoryId: string | null;
};

export type GoalPeriodActualContext = {
  blocks?: readonly GoalTimeBlockLike[];
  focusSessions?: readonly GoalFocusSessionLike[];
  segmentsBySessionId?: ReadonlyMap<string, readonly GoalFocusSegmentLike[]>;
  periodStart: Date;
  periodEnd: Date;
  categoryId?: string | null;
  progressWindowEnd?: Date;
};

export type GoalPeriodRange = {
  periodStart: Date;
  periodEnd: Date;
  targetMinutes: number;
};

export type GoalValidationError =
  | "empty_title"
  | "title_too_long"
  | "invalid_target_minutes"
  | "invalid_metric"
  | "invalid_goal_type"
  | "invalid_period"
  | "invalid_type_period_combo"
  | "missing_end_date"
  | "invalid_start_date"
  | "invalid_date_range";

export type GoalProgressSummary = {
  goalId: string;
  title: string;
  metric: string;
  categoryId: string | null;
  goalType: string;
  period: string;
  targetMinutes: number;
  isActive: boolean;
  currentPeriod: GoalPeriodLike | null;
  currentStreak: number;
  longestStreak: number;
  achievedCount: number;
  evaluatedCount: number;
  achievementRate: number;
  progressPercent: number;
};

const TITLE_MAX_LENGTH = 120;

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function isCountableStatus(status: string | null | undefined): boolean {
  const raw = String(status ?? "").trim();
  return raw === "completed" || raw === "partial";
}

function completedMinutesForClippedBlock(
  block: GoalTimeBlockLike,
  clippedMinutes: number,
): number {
  if (clippedMinutes <= 0) return 0;
  const status = String(block.status ?? "").trim();
  if (status === "completed") return clippedMinutes;
  if (status === "partial") {
    const pct = clampPercent(Number(block.completionLevel ?? 0));
    return Math.round((clippedMinutes * pct) / 100);
  }
  return 0;
}

/**
 * Exclusive end for progress counting within a period.
 * Active periods clip at `now`; ended periods use full `periodEnd`.
 */
export function effectiveProgressWindowEnd(
  periodEnd: Date,
  now: Date,
): Date {
  return periodEnd.getTime() <= now.getTime() ? periodEnd : now;
}

/** Parse `YYYY-MM-DD` as that civil date in `timeZone` (not server local). */
export function parseGoalDateParamInTimeZone(
  param: string,
  timeZone: string,
): Date | null {
  const trimmed = param.trim();
  if (!GOAL_DATE_PARAM_PATTERN.test(trimmed)) return null;
  const day = zonedStartOfCalendarDay(trimmed, timeZone);
  if (formatCalendarDateParamInTimeZone(day, timeZone) !== trimmed) return null;
  return day;
}

/** Stable key for deduplicating GoalPeriod rows during lazy generation. */
export function goalPeriodIdentityKey(goalId: string, periodStart: Date): string {
  return `${goalId}:${periodStart.toISOString()}`;
}

export function filterNewGoalPeriodRanges<
  T extends { goalId: string; periodStart: Date },
>(existingKeys: ReadonlySet<string>, ranges: readonly T[]): T[] {
  return ranges.filter(
    (range) =>
      !existingKeys.has(goalPeriodIdentityKey(range.goalId, range.periodStart)),
  );
}

/** Minutes from TimeBlocks that count toward a goal period window. */
export function calculateActualMinutesInPeriod(
  blocks: readonly GoalTimeBlockLike[],
  periodStart: Date,
  periodEnd: Date,
  categoryId?: string | null,
  progressWindowEnd: Date = periodEnd,
): number {
  const windowEnd =
    progressWindowEnd.getTime() < periodEnd.getTime()
      ? progressWindowEnd
      : periodEnd;
  if (windowEnd.getTime() <= periodStart.getTime()) return 0;

  let total = 0;
  for (const block of blocks) {
    if (!isCountableStatus(block.status)) continue;
    if (categoryId && block.categoryId !== categoryId) continue;

    const clipped = overlapMinutes(
      block.startTime,
      block.endTime,
      periodStart,
      windowEnd,
    );
    total += completedMinutesForClippedBlock(block, clipped);
  }
  return total;
}

const GOAL_FOCUS_COUNTABLE_STATUSES = new Set(["completed", "converted"]);

export function isGoalFocusCountableStatus(status: string): boolean {
  return GOAL_FOCUS_COUNTABLE_STATUSES.has(String(status ?? "").trim());
}

function effectivePeriodWindowEnd(
  periodEnd: Date,
  progressWindowEnd: Date,
): Date {
  return progressWindowEnd.getTime() < periodEnd.getTime()
    ? progressWindowEnd
    : periodEnd;
}

/** Count completed TimeBlocks whose startTime falls in the period window. */
export function calculateCompletedBlocksCountInPeriod(
  blocks: readonly GoalTimeBlockLike[],
  periodStart: Date,
  periodEnd: Date,
  categoryId?: string | null,
  progressWindowEnd: Date = periodEnd,
): number {
  const windowEnd = effectivePeriodWindowEnd(periodEnd, progressWindowEnd);
  if (windowEnd.getTime() <= periodStart.getTime()) return 0;

  let count = 0;
  for (const block of blocks) {
    if (String(block.status ?? "").trim() !== "completed") continue;
    if (categoryId && block.categoryId !== categoryId) continue;
    if (
      block.startTime.getTime() >= periodStart.getTime() &&
      block.startTime.getTime() < windowEnd.getTime()
    ) {
      count++;
    }
  }
  return count;
}

/** Sum focus minutes from completed/converted sessions (FocusSession-based only). */
export function calculateFocusMinutesInPeriod(
  sessions: readonly GoalFocusSessionLike[],
  segmentsBySessionId: ReadonlyMap<string, readonly GoalFocusSegmentLike[]>,
  periodStart: Date,
  periodEnd: Date,
  categoryId?: string | null,
  progressWindowEnd: Date = periodEnd,
): number {
  const windowEnd = effectivePeriodWindowEnd(periodEnd, progressWindowEnd);
  if (windowEnd.getTime() <= periodStart.getTime()) return 0;

  let total = 0;
  for (const session of sessions) {
    if (!isGoalFocusCountableStatus(session.status)) continue;

    const segments = segmentsBySessionId.get(session.id);
    if (segments && segments.length > 0) {
      for (const segment of segments) {
        if (categoryId && segment.categoryId !== categoryId) continue;
        if (
          segment.startTime.getTime() >= periodStart.getTime() &&
          segment.startTime.getTime() < windowEnd.getTime()
        ) {
          total += segment.durationMinutes ?? 0;
        }
      }
      continue;
    }

    if (categoryId && session.categoryId !== categoryId) continue;
    if (
      session.startTime.getTime() >= periodStart.getTime() &&
      session.startTime.getTime() < windowEnd.getTime()
    ) {
      total += focusSessionDisplayMinutes(session);
    }
  }
  return total;
}

/** Count completed/converted focus sessions whose startTime falls in the period window. */
export function calculateFocusSessionsCountInPeriod(
  sessions: readonly GoalFocusSessionLike[],
  periodStart: Date,
  periodEnd: Date,
  categoryId?: string | null,
  progressWindowEnd: Date = periodEnd,
): number {
  const windowEnd = effectivePeriodWindowEnd(periodEnd, progressWindowEnd);
  if (windowEnd.getTime() <= periodStart.getTime()) return 0;

  let count = 0;
  for (const session of sessions) {
    if (!isGoalFocusCountableStatus(session.status)) continue;
    if (categoryId && session.categoryId !== categoryId) continue;
    if (
      session.startTime.getTime() >= periodStart.getTime() &&
      session.startTime.getTime() < windowEnd.getTime()
    ) {
      count++;
    }
  }
  return count;
}

/** Dispatch period progress calculation by goal metric. */
export function calculateGoalPeriodActual(
  metric: string,
  context: GoalPeriodActualContext,
): number {
  const progressWindowEnd =
    context.progressWindowEnd ?? context.periodEnd;

  switch (metric as GoalMetric) {
    case "time_block_minutes":
      return calculateActualMinutesInPeriod(
        context.blocks ?? [],
        context.periodStart,
        context.periodEnd,
        context.categoryId,
        progressWindowEnd,
      );
    case "completed_blocks_count":
      return calculateCompletedBlocksCountInPeriod(
        context.blocks ?? [],
        context.periodStart,
        context.periodEnd,
        context.categoryId,
        progressWindowEnd,
      );
    case "focus_minutes":
      return calculateFocusMinutesInPeriod(
        context.focusSessions ?? [],
        context.segmentsBySessionId ?? new Map(),
        context.periodStart,
        context.periodEnd,
        context.categoryId,
        progressWindowEnd,
      );
    case "focus_sessions_count":
      return calculateFocusSessionsCountInPeriod(
        context.focusSessions ?? [],
        context.periodStart,
        context.periodEnd,
        context.categoryId,
        progressWindowEnd,
      );
    default:
      return 0;
  }
}

/** Evaluate period status from elapsed time and progress. */
export function evaluateGoalPeriodStatus(
  periodEnd: Date,
  now: Date,
  actualMinutes: number,
  targetMinutes: number,
): GoalPeriodStatus {
  if (now.getTime() < periodEnd.getTime()) {
    return "active";
  }
  return actualMinutes >= targetMinutes ? "achieved" : "missed";
}

function normalizeGoalStart(goal: Pick<GoalLike, "startDate">, timeZone: string): Date {
  return startOfDay(goal.startDate, timeZone);
}

function capPeriodEndAtGoalEnd(
  periodEnd: Date,
  goalEndDate: Date | null | undefined,
  timeZone: string,
): Date {
  if (!goalEndDate) return periodEnd;
  const goalEnd = endOfDay(goalEndDate, timeZone);
  return periodEnd.getTime() > goalEnd.getTime() ? goalEnd : periodEnd;
}

function generationHorizon(
  goal: Pick<GoalLike, "endDate">,
  now: Date,
  timeZone: string,
): Date {
  if (goal.endDate) {
    return endOfDay(goal.endDate, timeZone);
  }
  return now;
}

/** Build expected period ranges for a goal up to `now` (lazy generation). */
export function buildGoalPeriodRanges(
  goal: Pick<
    GoalLike,
    "goalType" | "period" | "startDate" | "endDate" | "targetMinutes"
  >,
  now: Date,
  timeZone: string,
): GoalPeriodRange[] {
  const goalStart = normalizeGoalStart(goal, timeZone);
  const horizon = generationHorizon(goal, now, timeZone);

  if (goal.period === "once" && goal.goalType === "one_time") {
    if (!goal.endDate) return [];
    const periodStart = goalStart;
    const periodEnd = endOfDay(goal.endDate, timeZone);
    if (periodStart.getTime() >= periodEnd.getTime()) return [];
    return [{ periodStart, periodEnd, targetMinutes: goal.targetMinutes }];
  }

  if (goal.period === "daily" && goal.goalType === "recurring") {
    const ranges: GoalPeriodRange[] = [];
    let cursor = goalStart;
    const lastDayStart = startOfDay(
      horizon.getTime() < now.getTime() ? horizon : now,
      timeZone,
    );

    while (cursor.getTime() <= lastDayStart.getTime()) {
      const periodStart = startOfDay(cursor, timeZone);
      let periodEnd = endOfDay(cursor, timeZone);
      periodEnd = capPeriodEndAtGoalEnd(periodEnd, goal.endDate, timeZone);
      if (periodStart.getTime() < periodEnd.getTime()) {
        ranges.push({
          periodStart,
          periodEnd,
          targetMinutes: goal.targetMinutes,
        });
      }
      cursor = addCalendarDays(cursor, 1, timeZone);
      if (goal.endDate && periodEnd.getTime() >= endOfDay(goal.endDate, timeZone).getTime()) {
        break;
      }
    }
    return ranges;
  }

  if (goal.period === "weekly" && goal.goalType === "recurring") {
    const ranges: GoalPeriodRange[] = [];
    let weekCursor = startOfWeekMonday(goalStart, timeZone);
    const lastWeekStart = startOfWeekMonday(
      horizon.getTime() < now.getTime() ? horizon : now,
      timeZone,
    );

    while (weekCursor.getTime() <= lastWeekStart.getTime()) {
      const periodStart = weekCursor;
      let periodEnd = endOfWeekMonday(weekCursor, timeZone);
      periodEnd = capPeriodEndAtGoalEnd(periodEnd, goal.endDate, timeZone);
      if (periodStart.getTime() < periodEnd.getTime()) {
        ranges.push({
          periodStart,
          periodEnd,
          targetMinutes: goal.targetMinutes,
        });
      }
      weekCursor = addCalendarDays(weekCursor, 7, timeZone);
      if (goal.endDate && periodEnd.getTime() >= endOfDay(goal.endDate, timeZone).getTime()) {
        break;
      }
    }
    return ranges;
  }

  return [];
}

export function isValidGoalTypePeriodCombo(
  goalType: string,
  period: string,
): boolean {
  if (goalType === "one_time" && period === "once") return true;
  if (goalType === "recurring" && (period === "daily" || period === "weekly")) {
    return true;
  }
  return false;
}

export function validateGoalInput(input: {
  title: string;
  targetMinutes: number;
  metric: string;
  goalType: string;
  period: string;
  startDate: Date;
  endDate: Date | null;
}): GoalValidationError | null {
  return validateGoalFields({
    title: input.title,
    targetMinutes: input.targetMinutes,
    metric: input.metric,
    goalType: input.goalType,
    period: input.period,
    startDate: input.startDate,
    endDate: input.endDate,
    requireMetric: true,
  });
}

/** Validate editable goal fields against the goal's fixed type/period/startDate. */
export function validateGoalUpdateInput(input: {
  title: string;
  targetMinutes: number;
  metric: string;
  goalType: string;
  period: string;
  startDate: Date;
  endDate: Date | null;
}): GoalValidationError | null {
  return validateGoalFields({
    title: input.title,
    targetMinutes: input.targetMinutes,
    metric: input.metric,
    goalType: input.goalType,
    period: input.period,
    startDate: input.startDate,
    endDate: input.endDate,
    requireMetric: false,
  });
}

function validateGoalFields(input: {
  title: string;
  targetMinutes: number;
  metric?: string;
  goalType: string;
  period: string;
  startDate: Date;
  endDate: Date | null;
  requireMetric: boolean;
}): GoalValidationError | null {
  if (!isNonEmptyTrimmed(input.title)) {
    return "empty_title";
  }
  if (input.title.trim().length > TITLE_MAX_LENGTH) {
    return "title_too_long";
  }
  if (!Number.isFinite(input.targetMinutes) || input.targetMinutes <= 0) {
    return "invalid_target_minutes";
  }
  if (
    input.metric &&
    isGoalCountMetric(input.metric) &&
    !Number.isInteger(input.targetMinutes)
  ) {
    return "invalid_target_minutes";
  }
  if (
    input.requireMetric &&
    (!input.metric || !(GOAL_METRICS as readonly string[]).includes(input.metric))
  ) {
    return "invalid_metric";
  }
  if (!(GOAL_TYPES as readonly string[]).includes(input.goalType)) {
    return "invalid_goal_type";
  }
  if (!(GOAL_PERIODS as readonly string[]).includes(input.period)) {
    return "invalid_period";
  }
  if (!isValidGoalTypePeriodCombo(input.goalType, input.period)) {
    return "invalid_type_period_combo";
  }
  if (Number.isNaN(input.startDate.getTime())) {
    return "invalid_start_date";
  }
  if (input.goalType === "one_time" && !input.endDate) {
    return "missing_end_date";
  }
  if (input.endDate && input.endDate.getTime() <= input.startDate.getTime()) {
    return "invalid_date_range";
  }
  return null;
}

/** Current consecutive achieved streak; active (unfinished) periods are skipped. */
export function calculateCurrentStreak(
  periods: readonly Pick<GoalPeriodLike, "periodStart" | "status">[],
): number {
  const sorted = [...periods].sort(
    (a, b) => b.periodStart.getTime() - a.periodStart.getTime(),
  );
  let streak = 0;
  for (const period of sorted) {
    if (period.status === "active") continue;
    if (period.status === "achieved") {
      streak++;
      continue;
    }
    if (period.status === "missed") break;
  }
  return streak;
}

/** Longest consecutive achieved streak across evaluated periods. */
export function calculateLongestStreak(
  periods: readonly Pick<GoalPeriodLike, "periodStart" | "status">[],
): number {
  const sorted = [...periods].sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
  );
  let maxStreak = 0;
  let currentRun = 0;
  for (const period of sorted) {
    if (period.status === "active") continue;
    if (period.status === "achieved") {
      currentRun++;
      maxStreak = Math.max(maxStreak, currentRun);
    } else if (period.status === "missed") {
      currentRun = 0;
    }
  }
  return maxStreak;
}

export function calculateAchievementStats(
  periods: readonly Pick<GoalPeriodLike, "status">[],
): {
  achievedCount: number;
  evaluatedCount: number;
  achievementRate: number;
} {
  let achievedCount = 0;
  let evaluatedCount = 0;
  for (const period of periods) {
    if (period.status === "active") continue;
    evaluatedCount++;
    if (period.status === "achieved") achievedCount++;
  }
  return {
    achievedCount,
    evaluatedCount,
    achievementRate: evaluatedCount > 0 ? achievedCount / evaluatedCount : 0,
  };
}

export function getCurrentGoalPeriod(
  periods: readonly GoalPeriodLike[],
): GoalPeriodLike | null {
  const active = periods.filter((p) => p.status === "active");
  if (active.length === 0) return null;
  return active.reduce((latest, p) =>
    p.periodStart.getTime() > latest.periodStart.getTime() ? p : latest,
  );
}

/** Active period, or most recent period for ended one-time / inactive display. */
export function getDisplayGoalPeriod(
  periods: readonly GoalPeriodLike[],
): GoalPeriodLike | null {
  const active = getCurrentGoalPeriod(periods);
  if (active) return active;
  if (periods.length === 0) return null;
  return [...periods].sort(
    (a, b) => b.periodStart.getTime() - a.periodStart.getTime(),
  )[0];
}

export function formatGoalProgressSummary(
  goal: GoalLike,
  periods: readonly GoalPeriodLike[],
): GoalProgressSummary {
  const displayPeriod = getDisplayGoalPeriod(periods);
  const stats = calculateAchievementStats(periods);
  const currentStreak = calculateCurrentStreak(periods);
  const longestStreak = calculateLongestStreak(periods);

  const actual = displayPeriod?.actualMinutes ?? 0;
  const target = displayPeriod?.targetMinutes ?? goal.targetMinutes;
  const progressPercent =
    target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;

  return {
    goalId: goal.id,
    title: goal.title,
    metric: goal.metric,
    categoryId: goal.categoryId ?? null,
    goalType: goal.goalType,
    period: goal.period,
    targetMinutes: goal.targetMinutes,
    isActive: goal.isActive,
    currentPeriod: displayPeriod,
    currentStreak,
    longestStreak,
    achievedCount: stats.achievedCount,
    evaluatedCount: stats.evaluatedCount,
    achievementRate: stats.achievementRate,
    progressPercent,
  };
}

export function isValidGoalPeriodStatus(status: string): status is GoalPeriodStatus {
  return (GOAL_PERIOD_STATUSES as readonly string[]).includes(status);
}

export function isValidGoalPeriodKind(period: string): period is GoalPeriodKind {
  return (GOAL_PERIODS as readonly string[]).includes(period);
}

export function isValidGoalType(goalType: string): goalType is GoalType {
  return (GOAL_TYPES as readonly string[]).includes(goalType);
}

export const GOAL_LIST_FILTERS = [
  "active",
  "history",
  "missed",
  "inactive",
  "all",
] as const;

export type GoalListFilter = (typeof GOAL_LIST_FILTERS)[number];

export function parseGoalListFilter(value: string | undefined | null): GoalListFilter {
  if (value && (GOAL_LIST_FILTERS as readonly string[]).includes(value)) {
    return value as GoalListFilter;
  }
  return "active";
}

export function goalHasAchievedPeriod(
  periods: readonly Pick<GoalPeriodLike, "status">[],
): boolean {
  return periods.some((period) => period.status === "achieved");
}

export function goalHasMissedPeriod(
  periods: readonly Pick<GoalPeriodLike, "status">[],
): boolean {
  return periods.some((period) => period.status === "missed");
}

export function matchesGoalListFilter(
  entry: {
    goal: Pick<GoalLike, "isActive">;
    periods: readonly Pick<GoalPeriodLike, "status">[];
  },
  filter: GoalListFilter,
): boolean {
  switch (filter) {
    case "active":
      return entry.goal.isActive;
    case "inactive":
      return !entry.goal.isActive;
    case "history":
      return goalHasAchievedPeriod(entry.periods);
    case "missed":
      return entry.goal.isActive && goalHasMissedPeriod(entry.periods);
    case "all":
      return true;
    default:
      return entry.goal.isActive;
  }
}

/** Historical periods are frozen; only active periods are re-evaluated. */
export function isFrozenGoalPeriodStatus(status: string): boolean {
  return status === "achieved" || status === "missed";
}

export function targetMinutesToHoursInput(minutes: number): string {
  return String(Math.round((minutes / 60) * 10) / 10);
}

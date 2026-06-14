"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  assertCategoryOwned,
  assertGoalOwned,
  focusSessionsForUser,
  goalsForUser,
  timeBlocksForUser,
} from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import {
  buildGoalPeriodRanges,
  calculateGoalPeriodActual,
  effectiveProgressWindowEnd,
  evaluateGoalPeriodStatus,
  filterNewGoalPeriodRanges,
  formatGoalProgressSummary,
  goalPeriodIdentityKey,
  isFrozenGoalPeriodStatus,
  parseGoalDateParamInTimeZone,
  parseGoalListFilter,
  validateGoalUpdateInput,
  type GoalFocusSegmentLike,
  type GoalFocusSessionLike,
  type GoalProgressSummary,
  type GoalTimeBlockLike,
  type GoalValidationError,
  validateGoalInput,
} from "@/lib/goals";
import {
  isGoalCountMetric,
  isGoalFocusMetric,
  isGoalTimeBlockMetric,
} from "@/lib/goals-metric-display";
import { prisma } from "@/lib/prisma";
import type { Goal, GoalPeriod } from "@/generated/prisma";
import { endOfDay } from "@/lib/calendar";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";
import {
  buildGoalDetailHref,
  buildGoalDetailProgress,
  buildGoalHistoryBars,
  deriveGoalOverallStatus,
  orderGoalPeriodsForHistory,
  parseGoalDetailFromFilter,
  type GoalHistoryBar,
  type GoalOverallStatus,
} from "@/lib/goals-detail";
import type { Locale } from "@/lib/i18n/types";

function parseOptionalText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseOptionalCategoryId(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseTargetMinutes(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0) return Number.NaN;
  return Math.round(hours * 60);
}

function parseTargetCount(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  const count = Number(raw);
  if (!Number.isFinite(count) || count <= 0 || !Number.isInteger(count)) {
    return Number.NaN;
  }
  return count;
}

function parseGoalTarget(formData: FormData, metric: string): number {
  if (isGoalCountMetric(metric)) {
    return parseTargetCount(formData.get("targetCount"));
  }
  return parseTargetMinutes(formData.get("targetHours"));
}

function parseGoalFormData(formData: FormData, timeZone: string) {
  const title = String(formData.get("title") ?? "");
  const description = parseOptionalText(formData.get("description"));
  const categoryId = parseOptionalCategoryId(formData.get("categoryId"));
  const metric = String(formData.get("metric") ?? "time_block_minutes").trim();
  const targetMinutes = parseGoalTarget(formData, metric);
  const goalType = String(formData.get("goalType") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();

  const startDate = parseGoalDateParamInTimeZone(startDateRaw, timeZone);
  const endDate = endDateRaw
    ? parseGoalDateParamInTimeZone(endDateRaw, timeZone)
    : null;

  return {
    title,
    description,
    categoryId,
    targetMinutes,
    metric,
    goalType,
    period,
    startDate: startDate ?? new Date(Number.NaN),
    endDate,
  };
}

function redirectWithValidationError(
  error: GoalValidationError,
  filter?: string,
): never {
  const filterParam = filter ? `&filter=${parseGoalListFilter(filter)}` : "";
  redirect(`/goals?error=${error}${filterParam}`);
}

function parseGoalUpdateFormData(
  formData: FormData,
  timeZone: string,
  metric: string,
) {
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "");
  const description = parseOptionalText(formData.get("description"));
  const categoryId = parseOptionalCategoryId(formData.get("categoryId"));
  const targetMinutes = parseGoalTarget(formData, metric);
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "") === "on";
  const filter = String(formData.get("filter") ?? "active").trim();

  const endDate = endDateRaw
    ? parseGoalDateParamInTimeZone(endDateRaw, timeZone)
    : null;

  return {
    id,
    title,
    description,
    categoryId,
    targetMinutes,
    endDate,
    isActive,
    filter,
  };
}

async function validateOptionalCategory(
  userId: string,
  categoryId: string | null,
): Promise<void> {
  if (!categoryId) return;
  try {
    await assertCategoryOwned(userId, categoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      redirect("/goals?error=invalid_category");
    }
    throw error;
  }
}

type GoalWithCategory = Goal & {
  category: { name: string; color: string } | null;
};

type GoalEvaluationContext = {
  blocks: readonly GoalTimeBlockLike[];
  focusSessions: readonly GoalFocusSessionLike[];
  segmentsBySessionId: ReadonlyMap<string, readonly GoalFocusSegmentLike[]>;
};

function computePeriodBounds(
  periods: readonly Pick<GoalPeriod, "periodStart" | "periodEnd">[],
  now: Date,
): { minStart: Date; maxEnd: Date } | null {
  if (periods.length === 0) return null;

  let minStart = periods[0].periodStart;
  let maxEnd = effectiveProgressWindowEnd(periods[0].periodEnd, now);
  for (const period of periods) {
    if (period.periodStart.getTime() < minStart.getTime()) {
      minStart = period.periodStart;
    }
    const effectiveEnd = effectiveProgressWindowEnd(period.periodEnd, now);
    if (effectiveEnd.getTime() > maxEnd.getTime()) {
      maxEnd = effectiveEnd;
    }
  }
  return { minStart, maxEnd };
}

function computePeriodUpdates(
  periods: GoalPeriod[],
  goalsById: Map<string, Goal>,
  context: GoalEvaluationContext,
  now: Date,
) {
  const updates: Array<{
    id: string;
    actualMinutes: number;
    status: string;
    evaluatedAt: Date | null;
  }> = [];

  for (const period of periods) {
    const goal = goalsById.get(period.goalId);
    if (!goal) continue;

    if (isFrozenGoalPeriodStatus(period.status)) {
      continue;
    }

    const progressWindowEnd = effectiveProgressWindowEnd(period.periodEnd, now);
    const actualMinutes = calculateGoalPeriodActual(goal.metric, {
      blocks: context.blocks,
      focusSessions: context.focusSessions,
      segmentsBySessionId: context.segmentsBySessionId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      categoryId: goal.categoryId,
      progressWindowEnd,
    });
    const status = evaluateGoalPeriodStatus(
      period.periodEnd,
      now,
      actualMinutes,
      period.targetMinutes,
    );
    const evaluatedAt =
      status === "active" ? null : period.evaluatedAt ?? now;

    if (
      period.actualMinutes !== actualMinutes ||
      period.status !== status ||
      (status !== "active" && !period.evaluatedAt)
    ) {
      updates.push({
        id: period.id,
        actualMinutes,
        status,
        evaluatedAt,
      });
    }
  }

  return updates;
}

async function fetchBlocksForGoalPeriods(
  userId: string,
  periods: readonly Pick<GoalPeriod, "periodStart" | "periodEnd">[],
  now: Date,
  includePartial: boolean,
): Promise<GoalTimeBlockLike[]> {
  const bounds = computePeriodBounds(periods, now);
  if (!bounds) return [];

  return timeBlocksForUser(userId, {
    where: {
      startTime: { lt: bounds.maxEnd },
      endTime: { gt: bounds.minStart },
      status: { in: includePartial ? ["completed", "partial"] : ["completed"] },
    },
    select: {
      startTime: true,
      endTime: true,
      categoryId: true,
      status: true,
      completionLevel: true,
    },
  });
}

async function fetchFocusSessionsForGoalPeriods(
  userId: string,
  periods: readonly Pick<GoalPeriod, "periodStart" | "periodEnd">[],
  now: Date,
): Promise<GoalFocusSessionLike[]> {
  const bounds = computePeriodBounds(periods, now);
  if (!bounds) return [];

  return focusSessionsForUser(userId, {
    where: {
      startTime: { gte: bounds.minStart, lt: bounds.maxEnd },
      status: { in: ["completed", "converted"] },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      categoryId: true,
      actualDurationMinutes: true,
      plannedDurationMinutes: true,
    },
  });
}

async function fetchFocusSegmentsForGoalPeriods(
  userId: string,
  periods: readonly Pick<GoalPeriod, "periodStart" | "periodEnd">[],
  now: Date,
  sessionIds: readonly string[],
): Promise<GoalFocusSegmentLike[]> {
  const bounds = computePeriodBounds(periods, now);
  if (!bounds || sessionIds.length === 0) return [];

  return prisma.focusSegment.findMany({
    where: {
      userId,
      focusSessionId: { in: [...sessionIds] },
      startTime: { gte: bounds.minStart, lt: bounds.maxEnd },
    },
    select: {
      focusSessionId: true,
      startTime: true,
      durationMinutes: true,
      categoryId: true,
    },
  });
}

function groupSegmentsBySessionId(
  segments: readonly GoalFocusSegmentLike[],
): Map<string, readonly GoalFocusSegmentLike[]> {
  const map = new Map<string, GoalFocusSegmentLike[]>();
  for (const segment of segments) {
    const list = map.get(segment.focusSessionId) ?? [];
    list.push(segment);
    map.set(segment.focusSessionId, list);
  }
  return map;
}

function goalsNeedTimeBlockData(goals: readonly Goal[]): boolean {
  return goals.some((goal) => isGoalTimeBlockMetric(goal.metric));
}

function goalsNeedFocusData(goals: readonly Goal[]): boolean {
  return goals.some((goal) => isGoalFocusMetric(goal.metric));
}

function goalsNeedFocusSegments(goals: readonly Goal[]): boolean {
  return goals.some((goal) => goal.metric === "focus_minutes");
}

function goalsNeedPartialBlocks(goals: readonly Goal[]): boolean {
  return goals.some((goal) => goal.metric === "time_block_minutes");
}

async function buildGoalEvaluationContext(
  userId: string,
  goals: readonly Goal[],
  periods: readonly GoalPeriod[],
  now: Date,
): Promise<GoalEvaluationContext> {
  const activePeriods = periods.filter((p) => !isFrozenGoalPeriodStatus(p.status));
  const scopePeriods = activePeriods.length > 0 ? activePeriods : periods;

  const focusSessions = goalsNeedFocusData(goals)
    ? await fetchFocusSessionsForGoalPeriods(userId, scopePeriods, now)
    : [];

  const [blocks, segments] = await Promise.all([
    goalsNeedTimeBlockData(goals)
      ? fetchBlocksForGoalPeriods(
          userId,
          scopePeriods,
          now,
          goalsNeedPartialBlocks(goals),
        )
      : Promise.resolve([] as GoalTimeBlockLike[]),
    goalsNeedFocusSegments(goals)
      ? fetchFocusSegmentsForGoalPeriods(
          userId,
          scopePeriods,
          now,
          focusSessions.map((session) => session.id),
        )
      : Promise.resolve([] as GoalFocusSegmentLike[]),
  ]);

  return {
    blocks,
    focusSessions,
    segmentsBySessionId: groupSegmentsBySessionId(segments),
  };
}

async function applyPeriodUpdates(
  userId: string,
  updates: Array<{
    id: string;
    actualMinutes: number;
    status: string;
    evaluatedAt: Date | null;
  }>,
): Promise<void> {
  if (updates.length === 0) return;

  await Promise.all(
    updates.map((row) =>
      prisma.goalPeriod.updateMany({
        where: { id: row.id, userId },
        data: {
          actualMinutes: row.actualMinutes,
          status: row.status,
          evaluatedAt: row.evaluatedAt,
        },
      }),
    ),
  );
}

async function createMissingGoalPeriods(
  userId: string,
  goals: Goal[],
  now: Date,
  timeZone: string,
): Promise<void> {
  if (goals.length === 0) return;

  const allRanges = goals.flatMap((goal) =>
    buildGoalPeriodRanges(goal, now, timeZone).map((range) => ({
      goalId: goal.id,
      ...range,
    })),
  );

  if (allRanges.length === 0) return;

  const existing = await prisma.goalPeriod.findMany({
    where: {
      userId,
      goalId: { in: goals.map((g) => g.id) },
    },
    select: { goalId: true, periodStart: true },
  });
  const existingKeys = new Set(
    existing.map((row) => goalPeriodIdentityKey(row.goalId, row.periodStart)),
  );

  const toCreate = filterNewGoalPeriodRanges(existingKeys, allRanges);
  if (toCreate.length === 0) return;

  await prisma.goalPeriod.createMany({
    data: toCreate.map((range) => ({
      goalId: range.goalId,
      userId,
      periodStart: range.periodStart,
      periodEnd: range.periodEnd,
      targetMinutes: range.targetMinutes,
    })),
  });
}

async function evaluatePeriodsForGoals(
  userId: string,
  goals: Goal[],
  now: Date,
): Promise<void> {
  if (goals.length === 0) return;

  const periods = await prisma.goalPeriod.findMany({
    where: {
      userId,
      goalId: { in: goals.map((g) => g.id) },
    },
    orderBy: { periodStart: "asc" },
  });

  if (periods.length === 0) return;

  const goalsById = new Map(goals.map((goal) => [goal.id, goal]));
  const context = await buildGoalEvaluationContext(userId, goals, periods, now);
  const updates = computePeriodUpdates(periods, goalsById, context, now);
  await applyPeriodUpdates(userId, updates);
}

export async function createGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const timeZone = await getUserCalendarTimeZone();
  const input = parseGoalFormData(formData, timeZone);

  const validationError = validateGoalInput(input);
  if (validationError) {
    redirectWithValidationError(validationError);
  }

  await validateOptionalCategory(user.id, input.categoryId);

  await prisma.goal.create({
    data: {
      userId: user.id,
      title: input.title.trim(),
      description: input.description,
      categoryId: input.categoryId,
      metric: input.metric,
      targetMinutes: input.targetMinutes,
      goalType: input.goalType,
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      isActive: true,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect("/goals?success=created");
}

export async function deactivateGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  try {
    await assertGoalOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) return;
    throw error;
  }

  await prisma.goal.updateMany({
    where: { id, userId: user.id },
    data: { isActive: false },
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect("/goals?success=deactivated");
}

export async function deleteGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  try {
    await assertGoalOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) return;
    throw error;
  }

  await prisma.goal.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect("/goals?success=deleted");
}

export async function updateGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const timeZone = await getUserCalendarTimeZone();
  const id = String(formData.get("id") ?? "").trim();
  const filter = parseGoalListFilter(String(formData.get("filter") ?? "active").trim());

  if (!id) {
    redirect(`/goals?filter=${filter}`);
  }

  let existing: Goal;
  try {
    existing = await assertGoalOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      redirect(`/goals?filter=${filter}`);
    }
    throw error;
  }

  const input = parseGoalUpdateFormData(formData, timeZone, existing.metric);

  const validationError = validateGoalUpdateInput({
    title: input.title,
    targetMinutes: input.targetMinutes,
    metric: existing.metric,
    goalType: existing.goalType,
    period: existing.period,
    startDate: existing.startDate,
    endDate: input.endDate,
  });

  if (validationError) {
    redirectWithValidationError(validationError, filter);
  }

  await validateOptionalCategory(user.id, input.categoryId);

  const nextEndDate = input.endDate;

  await prisma.goal.updateMany({
    where: { id: existing.id, userId: user.id },
    data: {
      title: input.title.trim(),
      description: input.description,
      categoryId: input.categoryId,
      targetMinutes: input.targetMinutes,
      endDate: nextEndDate,
      isActive: input.isActive,
    },
  });

  await prisma.goalPeriod.updateMany({
    where: {
      goalId: existing.id,
      userId: user.id,
      status: "active",
    },
    data: {
      targetMinutes: input.targetMinutes,
      ...(existing.goalType === "one_time" && nextEndDate
        ? { periodEnd: endOfDay(nextEndDate, timeZone) }
        : {}),
    },
  });

  const updated = await assertGoalOwned(user.id, existing.id);
  if (updated.isActive) {
    await createMissingGoalPeriods(user.id, [updated], new Date(), timeZone);
  }
  await evaluatePeriodsForGoals(user.id, [updated], new Date());

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect(`/goals?success=updated&filter=${filter}`);
}

export type EvaluatedGoalData = {
  goal: GoalWithCategory & {
    goalPeriods: GoalPeriod[];
  };
  summary: GoalProgressSummary;
};

export async function ensureAndEvaluateGoalPeriodsForUser(
  userId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<EvaluatedGoalData[]> {
  const goals = await goalsForUser(userId, {
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true, color: true } },
    },
  });

  if (goals.length === 0) return [];

  await createMissingGoalPeriods(userId, goals, now, timeZone);
  await evaluatePeriodsForGoals(userId, goals, now);

  const refreshedPeriods = await prisma.goalPeriod.findMany({
    where: {
      userId,
      goalId: { in: goals.map((g) => g.id) },
    },
    orderBy: { periodStart: "desc" },
  });

  return goals.map((goal) => {
    const goalPeriods = refreshedPeriods.filter((p) => p.goalId === goal.id);
    const summary = formatGoalProgressSummary(goal, goalPeriods);
    return { goal: { ...goal, goalPeriods }, summary };
  });
}

export type GoalPageEntry = EvaluatedGoalData;

export async function loadGoalsPageData(userId: string, timeZone: string) {
  const now = new Date();
  const activeEvaluated = await ensureAndEvaluateGoalPeriodsForUser(
    userId,
    timeZone,
    now,
  );

  const inactiveGoals = await goalsForUser(userId, {
    where: { isActive: false },
    orderBy: { updatedAt: "desc" },
    include: {
      category: { select: { name: true, color: true } },
    },
  });

  if (inactiveGoals.length > 0) {
    await evaluatePeriodsForGoals(userId, inactiveGoals, now);
  }

  const inactivePeriods =
    inactiveGoals.length > 0
      ? await prisma.goalPeriod.findMany({
          where: {
            userId,
            goalId: { in: inactiveGoals.map((g) => g.id) },
          },
          orderBy: { periodStart: "desc" },
        })
      : [];

  const inactiveEntries: GoalPageEntry[] = inactiveGoals.map((goal) => {
    const goalPeriods = inactivePeriods.filter((p) => p.goalId === goal.id);
    return {
      goal: { ...goal, goalPeriods },
      summary: formatGoalProgressSummary(goal, goalPeriods),
    };
  });

  return {
    entries: [...activeEvaluated, ...inactiveEntries],
    now,
  };
}

export type GoalDetailData = {
  goal: GoalWithCategory & {
    goalPeriods: GoalPeriod[];
  };
  summary: GoalProgressSummary;
  overallStatus: GoalOverallStatus;
  progress: ReturnType<typeof buildGoalDetailProgress>;
  historyPeriods: GoalPeriod[];
  historyBars: GoalHistoryBar[];
  backHref: string;
};

export async function loadGoalDetailData(
  userId: string,
  goalId: string,
  timeZone: string,
  locale: Locale,
  fromFilter?: string | null,
): Promise<GoalDetailData | null> {
  const goals = await goalsForUser(userId, {
    where: { id: goalId.trim() },
    include: {
      category: { select: { name: true, color: true } },
    },
  });

  if (goals.length === 0) return null;

  const goal = goals[0];
  const now = new Date();

  if (goal.isActive) {
    await createMissingGoalPeriods(userId, [goal], now, timeZone);
  }
  await evaluatePeriodsForGoals(userId, [goal], now);

  const goalPeriods = await prisma.goalPeriod.findMany({
    where: { userId, goalId: goal.id },
    orderBy: { periodStart: "desc" },
  });

  const summary = formatGoalProgressSummary(goal, goalPeriods);
  const displayPeriod = summary.currentPeriod;
  const overallStatus = deriveGoalOverallStatus(goal, displayPeriod);
  const progress = buildGoalDetailProgress(goal, displayPeriod, locale, timeZone);
  const historyPeriods = orderGoalPeriodsForHistory(goalPeriods) as GoalPeriod[];
  const historyBars = buildGoalHistoryBars(
    goalPeriods,
    goal.period,
    goal.metric,
    locale,
    timeZone,
  );
  const filter = parseGoalDetailFromFilter(fromFilter);
  const backHref =
    filter === "active" ? "/goals" : `/goals?filter=${filter}`;

  return {
    goal: { ...goal, goalPeriods },
    summary,
    overallStatus,
    progress,
    historyPeriods,
    historyBars,
    backHref,
  };
}

export async function refreshGoalProgress(formData: FormData): Promise<void> {
  const user = await requireUser();
  const goalId = String(formData.get("goalId") ?? "").trim();
  const fromFilter = String(formData.get("fromFilter") ?? "active").trim();

  if (!goalId) {
    redirect("/goals");
  }

  const goals = await goalsForUser(user.id, {
    where: { id: goalId },
  });

  if (goals.length === 0) {
    notFound();
  }

  const goal = goals[0];
  const timeZone = await getUserCalendarTimeZone();
  const now = new Date();

  if (goal.isActive) {
    await createMissingGoalPeriods(user.id, [goal], now, timeZone);
  }
  await evaluatePeriodsForGoals(user.id, [goal], now);

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  redirect(buildGoalDetailHref(goalId, fromFilter));
}

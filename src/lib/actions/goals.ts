"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  assertCategoryOwned,
  assertGoalOwned,
  goalsForUser,
  timeBlocksForUser,
} from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import {
  buildGoalPeriodRanges,
  calculateActualMinutesInPeriod,
  effectiveProgressWindowEnd,
  evaluateGoalPeriodStatus,
  filterNewGoalPeriodRanges,
  formatGoalProgressSummary,
  goalPeriodIdentityKey,
  isFrozenGoalPeriodStatus,
  parseGoalDateParamInTimeZone,
  parseGoalListFilter,
  validateGoalUpdateInput,
  type GoalProgressSummary,
  type GoalTimeBlockLike,
  type GoalValidationError,
  validateGoalInput,
} from "@/lib/goals";
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

function parseGoalFormData(formData: FormData, timeZone: string) {
  const title = String(formData.get("title") ?? "");
  const description = parseOptionalText(formData.get("description"));
  const categoryId = parseOptionalCategoryId(formData.get("categoryId"));
  const targetMinutes = parseTargetMinutes(formData.get("targetHours"));
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
    metric: "time_block_minutes" as const,
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

function parseGoalUpdateFormData(formData: FormData, timeZone: string) {
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "");
  const description = parseOptionalText(formData.get("description"));
  const categoryId = parseOptionalCategoryId(formData.get("categoryId"));
  const targetMinutes = parseTargetMinutes(formData.get("targetHours"));
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

function computePeriodUpdates(
  periods: GoalPeriod[],
  goalsById: Map<string, Goal>,
  blocks: readonly GoalTimeBlockLike[],
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
    const actualMinutes = calculateActualMinutesInPeriod(
      blocks,
      period.periodStart,
      period.periodEnd,
      goal.categoryId,
      progressWindowEnd,
    );
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
): Promise<GoalTimeBlockLike[]> {
  if (periods.length === 0) return [];

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

  return timeBlocksForUser(userId, {
    where: {
      startTime: { lt: maxEnd },
      endTime: { gt: minStart },
      status: { in: ["completed", "partial"] },
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

  const blocks = await fetchBlocksForGoalPeriods(userId, periods, now);
  const goalsById = new Map(goals.map((goal) => [goal.id, goal]));
  const updates = computePeriodUpdates(periods, goalsById, blocks, now);
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
  const input = parseGoalUpdateFormData(formData, timeZone);
  const filter = parseGoalListFilter(input.filter);

  if (!input.id) {
    redirect(`/goals?filter=${filter}`);
  }

  let existing: Goal;
  try {
    existing = await assertGoalOwned(user.id, input.id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      redirect(`/goals?filter=${filter}`);
    }
    throw error;
  }

  const validationError = validateGoalUpdateInput({
    title: input.title,
    targetMinutes: input.targetMinutes,
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
  const historyBars = buildGoalHistoryBars(goalPeriods, goal.period, locale, timeZone);
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

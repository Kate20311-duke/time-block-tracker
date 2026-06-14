/**
 * User-scoped Prisma access helpers (Phase 6).
 *
 * Middleware only blocks unauthenticated requests. These helpers ensure every
 * read/write is limited to rows owned by the current user, so guessing an `id`
 * cannot access another user's Category, TimeBlock, or FocusSession (IDOR).
 *
 * TimeBlock and FocusSession have no `userId` column; ownership is enforced via
 * `category.userId`.
 */

import type {
  Category,
  FocusSession,
  Goal,
  Prisma,
  Routine,
  TimeBlock,
} from "@/generated/prisma";
import {
  categoryScopeWhere,
  focusSessionScopeWhere,
  timeBlockScopeWhere,
} from "@/lib/db/scoped-where";
import { ScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";

export { ScopedAccessError, isScopedAccessError } from "@/lib/db/scoped-errors";

type CategoryFindManyArgs = Omit<Prisma.CategoryFindManyArgs, "where"> & {
  where?: Prisma.CategoryWhereInput;
};

type TimeBlockFindManyArgs = Omit<Prisma.TimeBlockFindManyArgs, "where"> & {
  where?: Prisma.TimeBlockWhereInput;
};

type FocusSessionFindManyArgs = Omit<Prisma.FocusSessionFindManyArgs, "where"> & {
  where?: Prisma.FocusSessionWhereInput;
};

type RoutineFindManyArgs = Omit<Prisma.RoutineFindManyArgs, "where"> & {
  where?: Prisma.RoutineWhereInput;
};

type GoalFindManyArgs = Omit<Prisma.GoalFindManyArgs, "where"> & {
  where?: Prisma.GoalWhereInput;
};

type GoalPeriodFindManyArgs = Omit<Prisma.GoalPeriodFindManyArgs, "where"> & {
  where?: Prisma.GoalPeriodWhereInput;
};

type CategoryPayload<T extends CategoryFindManyArgs> = Prisma.CategoryGetPayload<T>;
type TimeBlockPayload<T extends TimeBlockFindManyArgs> =
  Prisma.TimeBlockGetPayload<T>;
type FocusSessionPayload<T extends FocusSessionFindManyArgs> =
  Prisma.FocusSessionGetPayload<T>;
type RoutinePayload<T extends RoutineFindManyArgs> = Prisma.RoutineGetPayload<T>;
type GoalPayload<T extends GoalFindManyArgs> = Prisma.GoalGetPayload<T>;
type GoalPeriodPayload<T extends GoalPeriodFindManyArgs> =
  Prisma.GoalPeriodGetPayload<T>;

export {
  categoryScopeWhere,
  focusSessionScopeWhere,
  timeBlockScopeWhere,
} from "@/lib/db/scoped-where";

/** List categories owned by `userId`. */
export async function categoriesForUser<T extends CategoryFindManyArgs>(
  userId: string,
  options?: T,
): Promise<CategoryPayload<T>[]> {
  const { where, ...rest } = options ?? ({} as T);
  return prisma.category.findMany({
    ...rest,
    where: categoryScopeWhere(userId, where),
  }) as Promise<CategoryPayload<T>[]>;
}

/** List time blocks whose category belongs to `userId`. */
export async function timeBlocksForUser<T extends TimeBlockFindManyArgs>(
  userId: string,
  options?: T,
): Promise<TimeBlockPayload<T>[]> {
  const { where, ...rest } = options ?? ({} as T);
  return prisma.timeBlock.findMany({
    ...rest,
    where: timeBlockScopeWhere(userId, where),
  }) as Promise<TimeBlockPayload<T>[]>;
}

/** List focus sessions whose category belongs to `userId`. */
export async function focusSessionsForUser<T extends FocusSessionFindManyArgs>(
  userId: string,
  options?: T,
): Promise<FocusSessionPayload<T>[]> {
  const { where, ...rest } = options ?? ({} as T);
  return prisma.focusSession.findMany({
    ...rest,
    where: focusSessionScopeWhere(userId, where),
  }) as Promise<FocusSessionPayload<T>[]>;
}

/** List routines owned by `userId`. */
export async function routinesForUser<T extends RoutineFindManyArgs>(
  userId: string,
  options?: T,
): Promise<RoutinePayload<T>[]> {
  const { where, ...rest } = options ?? ({} as T);
  return prisma.routine.findMany({
    ...rest,
    where: { userId, ...where },
  }) as Promise<RoutinePayload<T>[]>;
}

/** List goals owned by `userId`. */
export async function goalsForUser<T extends GoalFindManyArgs>(
  userId: string,
  options?: T,
): Promise<GoalPayload<T>[]> {
  const { where, ...rest } = options ?? ({} as T);
  return prisma.goal.findMany({
    ...rest,
    where: { userId, ...where },
  }) as Promise<GoalPayload<T>[]>;
}

/** List goal periods owned by `userId`. */
export async function goalPeriodsForUser<T extends GoalPeriodFindManyArgs>(
  userId: string,
  options?: T,
): Promise<GoalPeriodPayload<T>[]> {
  const { where, ...rest } = options ?? ({} as T);
  return prisma.goalPeriod.findMany({
    ...rest,
    where: { userId, ...where },
  }) as Promise<GoalPeriodPayload<T>[]>;
}

/** Ensure `goalId` exists and belongs to `userId`; returns the goal row. */
export async function assertGoalOwned(
  userId: string,
  goalId: string,
): Promise<Goal> {
  const trimmedId = goalId.trim();
  if (!trimmedId) {
    throw new ScopedAccessError();
  }

  const goal = await prisma.goal.findFirst({
    where: { id: trimmedId, userId },
  });

  if (!goal) {
    throw new ScopedAccessError();
  }

  return goal;
}

/** Ensure `categoryId` exists and belongs to `userId`; returns the category row. */
export async function assertCategoryOwned(
  userId: string,
  categoryId: string,
): Promise<Category> {
  const trimmedId = categoryId.trim();
  if (!trimmedId) {
    throw new ScopedAccessError();
  }

  const category = await prisma.category.findFirst({
    where: { id: trimmedId, userId },
  });

  if (!category) {
    throw new ScopedAccessError();
  }

  return category;
}

/** Ensure `timeBlockId` exists and its category belongs to `userId`. */
export async function assertTimeBlockOwned(
  userId: string,
  timeBlockId: string,
): Promise<TimeBlock> {
  const trimmedId = timeBlockId.trim();
  if (!trimmedId) {
    throw new ScopedAccessError();
  }

  const block = await prisma.timeBlock.findFirst({
    where: { id: trimmedId, category: { userId } },
  });

  if (!block) {
    throw new ScopedAccessError();
  }

  return block;
}

/** Ensure `routineId` exists and belongs to `userId`. */
export async function assertRoutineOwned(
  userId: string,
  routineId: string,
): Promise<Routine> {
  const trimmedId = routineId.trim();
  if (!trimmedId) {
    throw new ScopedAccessError();
  }

  const routine = await prisma.routine.findFirst({
    where: { id: trimmedId, userId },
  });

  if (!routine) {
    throw new ScopedAccessError();
  }

  return routine;
}

/** Ensure `focusSessionId` exists and its category belongs to `userId`. */
export async function assertFocusSessionOwned(
  userId: string,
  focusSessionId: string,
): Promise<FocusSession> {
  const trimmedId = focusSessionId.trim();
  if (!trimmedId) {
    throw new ScopedAccessError();
  }

  const session = await prisma.focusSession.findFirst({
    where: { id: trimmedId, category: { userId } },
  });

  if (!session) {
    throw new ScopedAccessError();
  }

  return session;
}

/** At most one running focus session per user (any mode). */
export async function runningFocusSessionForUser(
  userId: string,
  options?: Omit<FocusSessionFindManyArgs, "where" | "take">,
): Promise<FocusSession | null> {
  const sessions = await focusSessionsForUser(userId, {
    ...options,
    where: { status: "running" },
    take: 1,
  });
  return sessions[0] ?? null;
}

/** Running or paused stopwatch/pomodoro session — at most one per user. */
export async function activeFocusSessionForUser(
  userId: string,
  options?: Omit<FocusSessionFindManyArgs, "where" | "take">,
): Promise<FocusSession | null> {
  const sessions = await focusSessionsForUser(userId, {
    ...options,
    where: { status: { in: ["running", "paused"] } },
    take: 1,
  });
  return sessions[0] ?? null;
}

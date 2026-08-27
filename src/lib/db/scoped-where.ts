import type { Prisma } from "@/generated/prisma";

/** Merge user scope with optional extra filters (safe with OR/AND in `extra`). */
export function mergeScopedWhere<T extends Record<string, unknown>>(
  scope: T,
  extra?: T,
): T {
  if (!extra || Object.keys(extra).length === 0) {
    return scope;
  }
  return { AND: [scope, extra] } as unknown as T;
}

export function categoryScopeWhere(
  userId: string,
  where?: Prisma.CategoryWhereInput,
): Prisma.CategoryWhereInput {
  return mergeScopedWhere({ userId }, where);
}

export function timeBlockScopeWhere(
  userId: string,
  where?: Prisma.TimeBlockWhereInput,
): Prisma.TimeBlockWhereInput {
  return mergeScopedWhere({ category: { userId } }, where);
}

export function focusSessionScopeWhere(
  userId: string,
  where?: Prisma.FocusSessionWhereInput,
): Prisma.FocusSessionWhereInput {
  return mergeScopedWhere({ userId }, where);
}

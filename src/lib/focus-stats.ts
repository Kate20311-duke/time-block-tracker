import { focusSessionDisplayMinutes } from "@/lib/focus";
import {
  FOCUS_CATEGORY_REMOVED_ID,
  hasFocusCategoryId,
} from "@/lib/focus-category-display";
import type { CategoryLike } from "@/lib/stats";

export type FocusSessionLike = {
  startTime: Date;
  endTime: Date | null;
  status: string;
  categoryId: string | null;
  actualDurationMinutes: number | null;
  plannedDurationMinutes: number;
  convertedToTimeBlock: boolean;
};

export type FocusCategorySummary = {
  categoryId: string;
  categoryName: string | null;
  categoryColor: string | null;
  totalMinutes: number;
  sessionCount: number;
  convertedSessionCount: number;
};

export type FocusSessionSummary = {
  totalFocusMinutes: number;
  /** Completed/converted sessions already written to a TimeBlock. */
  convertedFocusMinutes: number;
  /** Completed sessions not yet written to a TimeBlock. */
  unconvertedFocusMinutes: number;
  completedCount: number;
  abandonedCount: number;
  convertedCount: number;
  /** completed / (completed + abandoned), 0 when no terminal sessions */
  completionRate: number;
  categoryBreakdown: FocusCategorySummary[];
};

const COMPLETED_STATUSES = new Set(["completed", "converted"]);

export function isFocusSessionCompleted(status: string): boolean {
  return COMPLETED_STATUSES.has(status);
}

export function isFocusSessionConverted(session: {
  status: string;
  convertedToTimeBlock: boolean;
}): boolean {
  return session.status === "converted" || session.convertedToTimeBlock;
}

/** Minutes counted toward “focus time” totals (completed or converted only). */
export function focusStatsMinutesForSession(session: FocusSessionLike): number {
  if (!isFocusSessionCompleted(session.status)) {
    return 0;
  }
  return focusSessionDisplayMinutes(session);
}

/** Sessions whose startTime falls in [rangeStart, rangeEnd). */
export function filterFocusSessionsByStartInRange(
  sessions: readonly FocusSessionLike[],
  rangeStart: Date,
  rangeEnd: Date,
): FocusSessionLike[] {
  return sessions.filter(
    (s) => s.startTime >= rangeStart && s.startTime < rangeEnd,
  );
}

export function summarizeFocusSessions(
  sessions: readonly FocusSessionLike[],
  categories: readonly CategoryLike[] = [],
): FocusSessionSummary {
  let totalFocusMinutes = 0;
  let convertedFocusMinutes = 0;
  let unconvertedFocusMinutes = 0;
  let completedCount = 0;
  let abandonedCount = 0;
  let convertedCount = 0;

  const byCategory = new Map<
    string,
    { minutes: number; sessions: number; converted: number }
  >();

  for (const s of sessions) {
    const status = s.status;

    if (status === "abandoned") {
      abandonedCount++;
      continue;
    }

    if (!isFocusSessionCompleted(status)) {
      continue;
    }

    completedCount++;
    const converted = isFocusSessionConverted(s);
    if (converted) {
      convertedCount++;
    }

    const minutes = focusStatsMinutesForSession(s);
    totalFocusMinutes += minutes;
    if (converted) {
      convertedFocusMinutes += minutes;
    } else {
      unconvertedFocusMinutes += minutes;
    }

    const categoryId = hasFocusCategoryId(s.categoryId)
      ? s.categoryId.trim()
      : FOCUS_CATEGORY_REMOVED_ID;
    const bucket = byCategory.get(categoryId) ?? {
      minutes: 0,
      sessions: 0,
      converted: 0,
    };
    bucket.minutes += minutes;
    bucket.sessions += 1;
    if (converted) {
      bucket.converted += 1;
    }
    byCategory.set(categoryId, bucket);
  }

  const terminal = completedCount + abandonedCount;
  const completionRate = terminal > 0 ? completedCount / terminal : 0;

  const categoryMeta = new Map(
    categories.map((c) => [c.id, { name: c.name, color: c.color }]),
  );

  const categoryBreakdown: FocusCategorySummary[] = Array.from(
    byCategory.entries(),
  )
    .map(([categoryId, bucket]) => {
      const meta = categoryMeta.get(categoryId);
      return {
        categoryId,
        categoryName: meta?.name ?? null,
        categoryColor: meta?.color ?? null,
        totalMinutes: bucket.minutes,
        sessionCount: bucket.sessions,
        convertedSessionCount: bucket.converted,
      };
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  return {
    totalFocusMinutes,
    convertedFocusMinutes,
    unconvertedFocusMinutes,
    completedCount,
    abandonedCount,
    convertedCount,
    completionRate,
    categoryBreakdown,
  };
}

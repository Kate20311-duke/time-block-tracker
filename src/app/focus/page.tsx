import { Suspense } from "react";

import { PageLoading } from "@/components/page-loading";
import { FocusPageView } from "@/components/focus/focus-page-view";
import type { FocusHistoryItem } from "@/components/focus-history";
import type { OrphanRunningPomodoro } from "@/components/focus-timer";
import type { RunningStopwatchSession } from "@/components/stopwatch-timer";
import { getDictionary } from "@/lib/i18n";
import { categoriesForUser, focusSessionsForUser } from "@/lib/db/scoped";
import { focusCategoryDisplay } from "@/lib/focus-category-display";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RECENT_FOCUS_SESSION_LIMIT = 20;

export default async function FocusPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const user = await requireUser();

  const [categories, recentSessions, activeSessions] = await Promise.all([
    categoriesForUser(user.id, {
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    focusSessionsForUser(user.id, {
      include: { category: true },
      orderBy: { startTime: "desc" },
      take: RECENT_FOCUS_SESSION_LIMIT,
    }),
    focusSessionsForUser(user.id, {
      where: { status: { in: ["running", "paused"] } },
      include: { category: true },
      orderBy: { startTime: "desc" },
      take: 1,
    }),
  ]);

  const activeSession = activeSessions[0] ?? null;
  const removedLabel = t.focus.categoryRemoved;

  const runningStopwatch: RunningStopwatchSession | null =
    activeSession?.mode === "stopwatch" &&
    (activeSession.status === "running" || activeSession.status === "paused")
      ? {
          id: activeSession.id,
          title: activeSession.title,
          note: activeSession.note,
          status: activeSession.status as "running" | "paused",
          startTime: activeSession.startTime.toISOString(),
          pausedAt: activeSession.pausedAt?.toISOString() ?? null,
          pausedTotalSeconds: activeSession.pausedTotalSeconds,
          pauseCount: activeSession.pauseCount,
          category: focusCategoryDisplay(activeSession.category, removedLabel),
        }
      : null;

  const anotherSessionRunning =
    activeSession !== null && runningStopwatch === null;

  const orphanPomodoroCategory = activeSession
    ? focusCategoryDisplay(activeSession.category, removedLabel)
    : null;

  const orphanRunningPomodoro: OrphanRunningPomodoro | null =
    activeSession?.mode === "pomodoro" && activeSession.status === "running"
      ? {
          id: activeSession.id,
          title: activeSession.title,
          categoryName: orphanPomodoroCategory?.name ?? removedLabel,
          categoryColor: orphanPomodoroCategory?.color ?? "",
          categoryRemoved: orphanPomodoroCategory?.removed ?? true,
          plannedDurationMinutes: activeSession.plannedDurationMinutes,
        }
      : null;

  const historyItems: FocusHistoryItem[] = recentSessions.map((session) => ({
    id: session.id,
    title: session.title,
    status: session.status,
    mode: session.mode,
    plannedDurationMinutes: session.plannedDurationMinutes,
    actualDurationMinutes: session.actualDurationMinutes,
    convertedToTimeBlock: session.convertedToTimeBlock,
    timeBlockId: session.timeBlockId,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString() ?? null,
    category: focusCategoryDisplay(session.category, removedLabel),
  }));

  return (
    <Suspense fallback={<PageLoading variant="focus" />}>
      <FocusPageView
        categories={categories}
        labels={t.focus}
        locale={locale}
        statusLabels={t.status}
        timeBlockLabels={{
          status: t.timeBlocks.status,
          completionRange: t.timeBlocks.completionRange,
        }}
        runningStopwatch={runningStopwatch}
        anotherSessionRunning={anotherSessionRunning}
        orphanRunningPomodoro={orphanRunningPomodoro}
        historyItems={historyItems}
        cancelLabel={t.common.cancel}
        confirmDeleteTitle={t.common.confirmDeleteTitle}
      />
    </Suspense>
  );
}

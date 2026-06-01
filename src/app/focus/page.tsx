import { FocusHistory, type FocusHistoryItem } from "@/components/focus-history";
import { FocusTimer } from "@/components/focus-timer";
import {
  StopwatchTimer,
  type RunningStopwatchSession,
} from "@/components/stopwatch-timer";
import { getDictionary } from "@/lib/i18n";
import { categoriesForUser, focusSessionsForUser } from "@/lib/db/scoped";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RECENT_FOCUS_SESSION_LIMIT = 20;

export default async function FocusPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const user = await requireUser();

  const [categories, recentSessions, runningSessions] = await Promise.all([
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
      where: { status: "running" },
      include: { category: true },
      orderBy: { startTime: "desc" },
      take: 1,
    }),
  ]);

  const runningSession = runningSessions[0] ?? null;

  const runningStopwatch: RunningStopwatchSession | null =
    runningSession?.mode === "stopwatch" && runningSession.status === "running"
      ? {
          id: runningSession.id,
          title: runningSession.title,
          note: runningSession.note,
          startTime: runningSession.startTime.toISOString(),
          category: {
            id: runningSession.category.id,
            name: runningSession.category.name,
            color: runningSession.category.color,
          },
        }
      : null;

  const anotherSessionRunning =
    runningSession !== null &&
    (runningSession.mode !== "stopwatch" || runningStopwatch === null);

  const historyItems: FocusHistoryItem[] = recentSessions.map((session) => ({
    id: session.id,
    title: session.title,
    status: session.status,
    plannedDurationMinutes: session.plannedDurationMinutes,
    actualDurationMinutes: session.actualDurationMinutes,
    convertedToTimeBlock: session.convertedToTimeBlock,
    timeBlockId: session.timeBlockId,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString() ?? null,
    category: {
      name: session.category.name,
      color: session.category.color,
    },
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t.focus.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t.focus.subtitle}</p>
      </div>

      <StopwatchTimer
        categories={categories}
        labels={t.focus}
        locale={locale}
        initialRunningSession={runningStopwatch}
        anotherSessionRunning={anotherSessionRunning}
      />

      <FocusTimer
        categories={categories}
        labels={t.focus}
        sessionBlocked={anotherSessionRunning || runningStopwatch !== null}
      />

      <FocusHistory
        sessions={historyItems}
        labels={t.focus}
        locale={locale}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  abandonFocusSession,
  cancelStopwatch,
  convertFocusSessionToTimeBlock,
} from "@/lib/actions/focus-sessions";
import type { FocusSessionActionError } from "@/lib/actions/focus-shared";
import { canConvertFocusSession } from "@/lib/actions/focus-shared";
import { isFocusSessionCompleted } from "@/lib/focus-stats";
import { focusSessionDisplayMinutes } from "@/lib/focus";
import { isFocusSessionRunning } from "@/lib/focus-session-status";
import type { Dictionary } from "@/lib/i18n/types";
import { formatDateTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/types";

export type FocusHistoryItem = {
  id: string;
  title: string | null;
  status: string;
  mode: string;
  plannedDurationMinutes: number;
  actualDurationMinutes: number | null;
  convertedToTimeBlock: boolean;
  timeBlockId: string | null;
  startTime: string;
  endTime: string | null;
  category: { name: string; color: string };
};

type Props = {
  sessions: FocusHistoryItem[];
  labels: Dictionary["focus"];
  locale: Locale;
};

function resolveFocusError(
  error: FocusSessionActionError | undefined,
  labels: Dictionary["focus"],
): string {
  if (!error) return labels.errors.generic;
  const key = error as keyof Dictionary["focus"]["errors"];
  return labels.errors[key] ?? labels.errors.generic;
}

function sessionStatusLabel(
  status: string,
  labels: Dictionary["focus"],
): string {
  const map = labels.sessionStatus;
  if (status in map) {
    return map[status as keyof typeof map];
  }
  return status;
}

function FocusHistoryRow({
  session,
  labels,
  locale,
  busyId,
  onBusy,
  onError,
  onDone,
}: {
  session: FocusHistoryItem;
  labels: Dictionary["focus"];
  locale: Locale;
  busyId: string | null;
  onBusy: (id: string | null) => void;
  onError: (message: string | null) => void;
  onDone: () => void;
}) {
  const start = new Date(session.startTime);
  const end = session.endTime ? new Date(session.endTime) : null;
  const minutes = focusSessionDisplayMinutes({
    actualDurationMinutes: session.actualDurationMinutes,
    plannedDurationMinutes: session.plannedDurationMinutes,
    startTime: start,
    endTime: end,
  });
  const displayTitle =
    session.title?.trim() || labels.defaultTimeBlockTitle;
  const canConvert = canConvertFocusSession({
    status: session.status,
    convertedToTimeBlock: session.convertedToTimeBlock,
    endTime: end,
  });
  const isTerminal = isFocusSessionCompleted(session.status);
  const isRunning = isFocusSessionRunning(session.status);
  const isStopwatch = session.mode === "stopwatch";

  const handleEndRunning = async () => {
    onBusy(session.id);
    onError(null);

    const result = isStopwatch
      ? await cancelStopwatch({ id: session.id })
      : await abandonFocusSession({ id: session.id, endTime: new Date() });

    onBusy(null);

    if (!result.ok) {
      onError(resolveFocusError(result.error, labels));
      return;
    }

    onDone();
  };

  const handleConvert = async () => {
    onBusy(session.id);
    onError(null);

    const result = await convertFocusSessionToTimeBlock({
      id: session.id,
      defaultTitle: labels.defaultTimeBlockTitle,
    });

    onBusy(null);

    if (!result.ok) {
      onError(resolveFocusError(result.error, labels));
      return;
    }

    onDone();
  };

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: session.category.color }}
            aria-hidden
          />
          <span className="break-words font-medium text-zinc-900">
            {displayTitle}
          </span>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
            {sessionStatusLabel(session.status, labels)}
          </span>
          {isStopwatch ? (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {labels.stopwatchModeBadge}
            </span>
          ) : (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {labels.pomodoroModeBadge}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-600">
          {formatDateTime(start, locale)}
          {" · "}
          {labels.historyCategory}: {session.category.name}
          {isTerminal || isRunning ? (
            <>
              {" · "}
              {labels.historyDuration}: {minutes} {labels.minutesUnit}
            </>
          ) : null}
        </p>
        {isTerminal ? (
          <p className="text-sm text-zinc-500">
            {session.convertedToTimeBlock || session.status === "converted"
              ? labels.historyConverted
              : labels.historyNotConverted}
            {session.timeBlockId ? (
              <>
                {" "}
                <Link
                  href="/time-blocks"
                  className="underline hover:text-zinc-800"
                >
                  →
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
        {isRunning ? (
          <button
            type="button"
            onClick={handleEndRunning}
            disabled={busyId !== null}
            className="w-full min-h-11 rounded border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-0 sm:py-1.5"
          >
            {busyId === session.id
              ? labels.working
              : isStopwatch
                ? labels.historyCancelRunning
                : labels.historyAbandonRunning}
          </button>
        ) : null}
        {canConvert ? (
          <button
            type="button"
            onClick={handleConvert}
            disabled={busyId !== null}
            className="w-full min-h-11 shrink-0 rounded bg-zinc-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-0 sm:py-1.5"
          >
            {busyId === session.id
              ? labels.working
              : labels.convertConfirm}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function FocusHistory({ sessions, labels, locale }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runningSessions = sessions.filter((s) => isFocusSessionRunning(s.status));
  const hasCompletedSessions = sessions.some((s) =>
    isFocusSessionCompleted(s.status),
  );
  const hasOnlyNonCompleted =
    sessions.length > 0 && !hasCompletedSessions && runningSessions.length === 0;

  const bannerMessage = runningSessions.length > 0
    ? labels.historyHasRunning
    : hasOnlyNonCompleted
      ? labels.historyOnlyNonCompleted
      : null;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{labels.historyTitle}</h2>

      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {errorMessage}
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-500">{labels.historyEmpty}</p>
      ) : (
        <>
          {bannerMessage ? (
            <p
              className={`mb-4 text-sm ${
                runningSessions.length > 0
                  ? "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
                  : "text-zinc-500"
              }`}
              role={runningSessions.length > 0 ? "status" : undefined}
            >
              {bannerMessage}
            </p>
          ) : null}
          <ul className="divide-y divide-zinc-100">
            {sessions.map((session) => (
              <FocusHistoryRow
                key={session.id}
                session={session}
                labels={labels}
                locale={locale}
                busyId={busyId}
                onBusy={setBusyId}
                onError={setErrorMessage}
                onDone={() => router.refresh()}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

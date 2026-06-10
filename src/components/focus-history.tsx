"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { formatDateTime } from "@/lib/time";

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
  cancelLabel: string;
  confirmDeleteTitle: string;
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
  cancelLabel,
  confirmDeleteTitle,
}: {
  session: FocusHistoryItem;
  labels: Dictionary["focus"];
  locale: Locale;
  busyId: string | null;
  onBusy: (id: string | null) => void;
  onError: (message: string | null) => void;
  onDone: () => void;
  cancelLabel: string;
  confirmDeleteTitle: string;
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
      const message = resolveFocusError(result.error, labels);
      onError(message);
      toast.error(message);
      return;
    }

    toast.success(
      isStopwatch ? labels.stopwatchSuccessCanceled : labels.confirmAbandonFocus,
    );
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
      const message = resolveFocusError(result.error, labels);
      onError(message);
      toast.error(message);
      return;
    }

    toast.success(labels.convertConfirm);
    onDone();
  };

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: session.category.color }}
            aria-hidden
          />
          <span className="break-words font-medium">{displayTitle}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">
            {sessionStatusLabel(session.status, labels)}
          </Badge>
          <Badge variant="secondary">
            {isStopwatch ? labels.stopwatchModeBadge : labels.pomodoroModeBadge}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(start, locale)}
          {" · "}
          {session.category.name}
          {isTerminal || isRunning ? (
            <>
              {" · "}
              {minutes} {labels.minutesUnit}
            </>
          ) : null}
        </p>
        {isTerminal ? (
          <p className="text-xs text-muted-foreground">
            {session.convertedToTimeBlock || session.status === "converted"
              ? labels.historyConverted
              : labels.historyNotConverted}
            {session.timeBlockId ? (
              <>
                {" "}
                <Link href="/time-blocks" className="underline hover:text-foreground">
                  →
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {isRunning ? (
          <ConfirmDeleteDialog
            title={confirmDeleteTitle}
            description={
              isStopwatch
                ? labels.confirmCancelStopwatch
                : labels.confirmAbandonRunningHistory
            }
            confirmLabel={
              isStopwatch
                ? labels.historyCancelRunning
                : labels.historyAbandonRunning
            }
            cancelLabel={cancelLabel}
            disabled={busyId !== null}
            onConfirm={handleEndRunning}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busyId !== null}
                className="text-muted-foreground"
              >
                {busyId === session.id
                  ? labels.working
                  : isStopwatch
                    ? labels.historyCancelRunning
                    : labels.historyAbandonRunning}
              </Button>
            }
          />
        ) : null}
        {canConvert ? (
          <Button
            type="button"
            size="sm"
            onClick={handleConvert}
            disabled={busyId !== null}
          >
            {busyId === session.id ? labels.working : labels.convertConfirm}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function FocusHistory({
  sessions,
  labels,
  locale,
  cancelLabel,
  confirmDeleteTitle,
}: Props) {
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
    <Card className="lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="text-base">{labels.historyTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}

        {sessions.length === 0 ? (
          <EmptyState
            title={labels.historyEmpty}
            description={labels.historyEmpty}
            actions={[
              { label: labels.categoriesLink, href: "/categories" },
              {
                label: labels.stopwatchStart,
                href: "/focus?mode=stopwatch",
                variant: "outline",
              },
            ]}
            className="border-0 shadow-none"
          />
        ) : (
          <>
            {bannerMessage ? (
              <CardDescription
                className={
                  runningSessions.length > 0
                    ? "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
                    : "mb-4"
                }
              >
                {bannerMessage}
              </CardDescription>
            ) : null}
            <ul className="divide-y divide-border">
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
                  cancelLabel={cancelLabel}
                  confirmDeleteTitle={confirmDeleteTitle}
                />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

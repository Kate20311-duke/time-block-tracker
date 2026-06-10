"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { StopwatchCompleteDialog } from "@/components/focus/stopwatch-complete-dialog";
import { ElapsedTimer } from "@/components/elapsed-timer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelStopwatch,
  completeStopwatchAndCreateTimeBlock,
  pauseStopwatch,
  resumeStopwatch,
  startStopwatch,
} from "@/lib/actions/focus-sessions";
import type { FocusSessionActionError } from "@/lib/actions/focus-shared";
import type { FocusCategoryOption } from "@/components/focus-timer";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { formatDateTime } from "@/lib/time";

export type RunningStopwatchSession = {
  id: string;
  title: string | null;
  note: string | null;
  status: "running" | "paused";
  startTime: string;
  pausedAt: string | null;
  pausedTotalSeconds: number;
  category: { id: string; name: string; color: string };
};

type Props = {
  categories: FocusCategoryOption[];
  labels: Dictionary["focus"];
  locale: Locale;
  statusLabels: Dictionary["status"];
  timeBlockLabels: Pick<Dictionary["timeBlocks"], "status" | "completionRange">;
  initialRunningSession: RunningStopwatchSession | null;
  anotherSessionRunning: boolean;
  initialCategoryId?: string;
  cancelLabel: string;
  confirmDeleteTitle: string;
};

type BusyAction = "start" | "end" | "cancel" | "pause" | "resume" | null;

function resolveFocusError(
  error: FocusSessionActionError | undefined,
  labels: Dictionary["focus"],
): string {
  if (!error) return labels.errors.generic;
  const map: Partial<Record<FocusSessionActionError, string>> = {
    session_already_running: labels.errors.sessionAlreadyRunning,
    invalid_category: labels.errors.invalidCategory,
    invalid_status: labels.errors.invalidStatus,
    invalid_state: labels.errors.invalidState,
    invalid_range: labels.errors.invalidRange,
    invalid_completion: labels.errors.invalidCompletion,
    not_found: labels.errors.notFound,
    update_failed: labels.errors.updateFailed,
    convert_failed: labels.errors.convertFailed,
    already_converted: labels.errors.alreadyConverted,
  };
  return map[error] ?? labels.errors.generic;
}

function labelWhenBusy(
  label: string,
  working: string,
  busy: boolean,
  action: BusyAction,
  current: BusyAction,
): string {
  return busy && action === current ? working : label;
}

function FocusAlert({
  variant,
  children,
}: {
  variant: "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  } as const;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}
    >
      {children}
    </div>
  );
}

function defaultCompleteTitle(
  session: RunningStopwatchSession,
  instantRecordTitle: string,
): string {
  const trimmed = session.title?.trim();
  if (trimmed) {
    return trimmed;
  }
  const categoryName = session.category.name.trim();
  if (categoryName) {
    return categoryName;
  }
  return instantRecordTitle;
}

export function StopwatchTimer({
  categories,
  labels,
  locale,
  statusLabels,
  timeBlockLabels,
  initialRunningSession,
  anotherSessionRunning,
  initialCategoryId = "",
  cancelLabel,
  confirmDeleteTitle,
}: Props) {
  const router = useRouter();
  const [runningSession, setRunningSession] =
    useState<RunningStopwatchSession | null>(initialRunningSession);
  const [categoryId, setCategoryId] = useState(
    initialRunningSession?.category.id ?? initialCategoryId,
  );
  const [title, setTitle] = useState(initialRunningSession?.title ?? "");
  const [note, setNote] = useState(initialRunningSession?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const isActive = runningSession !== null;
  const isPaused = runningSession?.status === "paused";
  const configLocked = isActive;
  const hasCategories = categories.length > 0;
  const formDisabled = configLocked || busy || anotherSessionRunning;

  const handleStart = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!categoryId) {
      setErrorMessage(labels.errors.invalidCategory);
      return;
    }

    setBusy(true);
    setBusyAction("start");
    const result = await startStopwatch({
      categoryId,
      title: title.trim() || null,
      note: note.trim() || null,
    });
    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      const message = resolveFocusError(result.error, labels);
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      router.refresh();
      return;
    }

    setRunningSession({
      id: result.data.id,
      title: title.trim() || null,
      note: note.trim() || null,
      status: "running",
      startTime: new Date().toISOString(),
      pausedAt: null,
      pausedTotalSeconds: 0,
      category: { id: category.id, name: category.name, color: category.color },
    });
    toast.success(labels.stopwatchStart);
    router.refresh();
  };

  const handlePause = async () => {
    if (!runningSession || busy || runningSession.status !== "running") return;

    setBusy(true);
    setBusyAction("pause");
    setErrorMessage(null);

    const result = await pauseStopwatch({ id: runningSession.id });

    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      const message = resolveFocusError(result.error, labels);
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setRunningSession({
      ...runningSession,
      status: "paused",
      pausedAt: new Date().toISOString(),
    });
    toast.success(labels.stopwatchPaused);
    router.refresh();
  };

  const handleResume = async () => {
    if (!runningSession || busy || runningSession.status !== "paused") return;

    setBusy(true);
    setBusyAction("resume");
    setErrorMessage(null);

    const pausedAtMs = runningSession.pausedAt
      ? new Date(runningSession.pausedAt).getTime()
      : Date.now();
    const segmentSeconds = Math.max(
      0,
      Math.floor((Date.now() - pausedAtMs) / 1000),
    );

    const result = await resumeStopwatch({ id: runningSession.id });

    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      const message = resolveFocusError(result.error, labels);
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setRunningSession({
      ...runningSession,
      status: "running",
      pausedAt: null,
      pausedTotalSeconds: runningSession.pausedTotalSeconds + segmentSeconds,
    });
    toast.success(labels.stopwatchResumed);
    router.refresh();
  };

  const handleCompleteConfirm = async (values: {
    title: string;
    note: string;
    status: string;
    completionLevel: number;
  }) => {
    if (!runningSession || busy) return;

    setBusy(true);
    setBusyAction("end");
    setErrorMessage(null);

    const result = await completeStopwatchAndCreateTimeBlock({
      id: runningSession.id,
      title: values.title,
      note: values.note || null,
      status: values.status,
      completionLevel: values.completionLevel,
      instantRecordTitle: labels.instantRecordTitle,
      defaultTitle: labels.stopwatchDefaultTimeBlockTitle,
    });

    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      const message = resolveFocusError(result.error, labels);
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setCompleteDialogOpen(false);
    setRunningSession(null);
    setStatusMessage(labels.stopwatchSuccessSaved);
    toast.success(labels.stopwatchSuccessSaved);
    router.refresh();
  };

  const handleCancel = async () => {
    if (!runningSession || busy) return;

    setBusy(true);
    setBusyAction("cancel");
    setErrorMessage(null);

    const result = await cancelStopwatch({ id: runningSession.id });

    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      const message = resolveFocusError(result.error, labels);
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setRunningSession(null);
    setStatusMessage(labels.stopwatchSuccessCanceled);
    toast.success(labels.stopwatchSuccessCanceled);
    router.refresh();
  };

  if (!hasCategories) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-base text-amber-950">
            {labels.emptyNoCategoriesTitle}
          </CardTitle>
          <CardDescription className="text-amber-900">
            {labels.needCategoryPrefix}{" "}
            <Link href="/categories" className="font-medium underline">
              {labels.categoriesLink}
            </Link>
            {labels.needCategorySuffix}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const completeDefaults = runningSession
    ? {
        title: defaultCompleteTitle(runningSession, labels.instantRecordTitle),
        note: runningSession.note?.trim() ?? "",
        status: "completed",
        completionLevel: 100,
      }
    : {
        title: "",
        note: "",
        status: "completed",
        completionLevel: 100,
      };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{labels.stopwatchTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {labels.stopwatchSubtitle}
        </p>
      </div>

      {anotherSessionRunning && !isActive ? (
        <FocusAlert variant="warning">
          {labels.stopwatchBlockedByOtherSession}
        </FocusAlert>
      ) : null}

      {statusMessage ? (
        <FocusAlert variant="success">{statusMessage}</FocusAlert>
      ) : null}

      {errorMessage ? (
        <FocusAlert variant="error">{errorMessage}</FocusAlert>
      ) : null}

      {isActive && runningSession ? (
        <Card className="overflow-hidden border-primary/20">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {isPaused ? (
                  <Pause className="size-4 text-muted-foreground" />
                ) : (
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                  </span>
                )}
                {isPaused ? labels.stopwatchPausedLabel : labels.stopwatchModeLabel}
              </CardTitle>
              <Badge variant="outline" className="gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: runningSession.category.color }}
                />
                {runningSession.category.name}
              </Badge>
            </div>
            <CardDescription>
              {labels.stopwatchStartedAt}:{" "}
              {formatDateTime(new Date(runningSession.startTime), locale)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ElapsedTimer
              startTimeIso={runningSession.startTime}
              pausedAtIso={runningSession.pausedAt}
              pausedTotalSeconds={runningSession.pausedTotalSeconds}
              isPaused={isPaused}
              ariaLabel={labels.stopwatchTimerAria}
              className="font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl"
            />
            <p className="text-sm text-muted-foreground">
              {runningSession.title?.trim() || labels.stopwatchUntitled}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {isPaused ? (
                <Button
                  type="button"
                  onClick={handleResume}
                  disabled={busy}
                  size="lg"
                >
                  <Play data-icon="inline-start" />
                  {labelWhenBusy(
                    labels.stopwatchResume,
                    labels.working,
                    busy,
                    "resume",
                    busyAction,
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePause}
                  disabled={busy}
                  size="lg"
                >
                  <Pause data-icon="inline-start" />
                  {labelWhenBusy(
                    labels.stopwatchPause,
                    labels.working,
                    busy,
                    "pause",
                    busyAction,
                  )}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setCompleteDialogOpen(true)}
                disabled={busy}
                size="lg"
              >
                {labels.stopwatchEndAndSave}
              </Button>
              <ConfirmDeleteDialog
                title={confirmDeleteTitle}
                description={labels.confirmCancelStopwatch}
                confirmLabel={labels.stopwatchCancel}
                cancelLabel={cancelLabel}
                disabled={busy}
                onConfirm={handleCancel}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    className="text-muted-foreground"
                  >
                    {labelWhenBusy(
                      labels.stopwatchCancel,
                      labels.working,
                      busy,
                      "cancel",
                      busyAction,
                    )}
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.setupTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="stopwatch-category"
                  className="text-sm font-medium"
                >
                  {labels.category}
                </label>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={formDisabled}
                >
                  <SelectTrigger id="stopwatch-category" className="w-full">
                    <SelectValue placeholder={labels.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="stopwatch-title" className="text-sm font-medium">
                  {labels.titleLabel}
                </label>
                <Input
                  id="stopwatch-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={formDisabled}
                  placeholder={labels.stopwatchTitlePlaceholder}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="stopwatch-note" className="text-sm font-medium">
                  {labels.noteOptional}
                </label>
                <Textarea
                  id="stopwatch-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={formDisabled}
                  rows={2}
                  placeholder={labels.notePlaceholder}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleStart}
              disabled={busy || anotherSessionRunning}
              size="lg"
              className="w-full sm:w-auto"
            >
              {labelWhenBusy(
                labels.stopwatchStart,
                labels.working,
                busy,
                "start",
                busyAction,
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <StopwatchCompleteDialog
        key={
          completeDialogOpen && runningSession
            ? `${runningSession.id}-complete`
            : "complete-closed"
        }
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        defaultValues={completeDefaults}
        labels={{
          stopwatchCompleteDialogTitle: labels.stopwatchCompleteDialogTitle,
          stopwatchCompleteDialogDescription:
            labels.stopwatchCompleteDialogDescription,
          titleLabel: labels.titleLabel,
          noteOptional: labels.noteOptional,
          notePlaceholder: labels.notePlaceholder,
          stopwatchEndAndSave: labels.stopwatchEndAndSave,
          status: timeBlockLabels.status,
          completionRange: timeBlockLabels.completionRange,
          cancel: cancelLabel,
        }}
        statusLabels={statusLabels}
        onConfirm={handleCompleteConfirm}
        busy={busy && busyAction === "end"}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  abandonFocusSession,
  completeFocusSession,
  convertFocusSessionToTimeBlock,
  createFocusSession,
} from "@/lib/actions/focus-sessions";
import type { FocusSessionActionError } from "@/lib/actions/focus-shared";
import {
  FOCUS_DURATION_PRESETS,
  formatFocusCountdown,
  parsePlannedFocusMinutes,
} from "@/lib/focus";
import { Button } from "@/components/ui/button";
import { FocusCategoryReassignmentDialog } from "@/components/focus/focus-category-reassignment-dialog";
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
import type { Dictionary } from "@/lib/i18n/types";

export type FocusCategoryOption = {
  id: string;
  name: string;
  color: string;
};

type TimerPhase = "setup" | "running" | "paused";

type BusyAction =
  | "start"
  | "complete"
  | "abandon"
  | "convert"
  | "skip"
  | null;

export type OrphanRunningPomodoro = {
  id: string;
  title: string | null;
  categoryName: string;
  categoryColor: string;
  categoryRemoved?: boolean;
  plannedDurationMinutes: number;
};

type Props = {
  categories: FocusCategoryOption[];
  labels: Dictionary["focus"];
  /** Another focus session (e.g. stopwatch) is already running in the DB. */
  sessionBlocked?: boolean;
  /** Server-side running Pomodoro after refresh (no local sessionId). */
  orphanRunningPomodoro?: OrphanRunningPomodoro | null;
  cancelLabel: string;
};

function FocusAlert({
  variant,
  children,
}: {
  variant: "success" | "error" | "warning" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-primary/20 bg-primary/5 text-foreground",
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

function resolveFocusError(
  error: FocusSessionActionError | undefined,
  labels: Dictionary["focus"],
): string {
  if (!error) return labels.errors.generic;
  const map: Partial<Record<FocusSessionActionError, string>> = {
    invalid_category: labels.errors.invalidCategory,
    invalid_status: labels.errors.invalidStatus,
    invalid_state: labels.errors.invalidState,
    invalid_range: labels.errors.invalidRange,
    not_found: labels.errors.notFound,
    update_failed: labels.errors.updateFailed,
    convert_failed: labels.errors.convertFailed,
    already_converted: labels.errors.alreadyConverted,
    session_already_running: labels.errors.sessionAlreadyRunning,
    pause_limit_exceeded: labels.errors.pauseLimitExceeded,
    needs_category: labels.errors.needsCategory,
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

export function FocusTimer({
  categories,
  labels,
  sessionBlocked = false,
  orphanRunningPomodoro = null,
  cancelLabel,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<TimerPhase>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingConvertSessionId, setPendingConvertSessionId] = useState<
    string | null
  >(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [durationMode, setDurationMode] = useState<number | "custom">(25);
  const [customMinutes, setCustomMinutes] = useState("30");
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const endTimestampRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const configLocked = phase !== "setup";
  const hasActiveSession = sessionId !== null;
  const hasCategories = categories.length > 0;
  const canOperateWithoutCategories =
    hasActiveSession ||
    Boolean(orphanRunningPomodoro) ||
    Boolean(pendingConvertSessionId) ||
    reassignOpen;

  const plannedMinutes =
    durationMode === "custom"
      ? (parsePlannedFocusMinutes(customMinutes) ?? 0)
      : durationMode;

  const showInvalidDuration =
    durationMode === "custom" && customMinutes.trim() !== "" && plannedMinutes <= 0;

  const syncRemainingFromClock = useCallback(() => {
    const end = endTimestampRef.current;
    if (end === null) return;
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    setRemainingSeconds(left);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => {
      syncRemainingFromClock();
    }, 250);
  }, [stopInterval, syncRemainingFromClock]);

  const beginCountdown = useCallback(
    (seconds: number) => {
      endTimestampRef.current = Date.now() + seconds * 1000;
      setRemainingSeconds(seconds);
      startInterval();
    },
    [startInterval],
  );

  const pauseCountdown = useCallback(() => {
    syncRemainingFromClock();
    endTimestampRef.current = null;
    stopInterval();
  }, [stopInterval, syncRemainingFromClock]);

  useEffect(() => {
    return () => stopInterval();
  }, [stopInterval]);

  const displaySeconds =
    phase === "setup"
      ? durationMode === "custom"
        ? (parsePlannedFocusMinutes(customMinutes) ?? 0) * 60
        : durationMode * 60
      : remainingSeconds;

  const resetSession = useCallback(() => {
    pauseCountdown();
    setPhase("setup");
    setSessionId(null);
    const displayMinutes =
      durationMode === "custom"
        ? parsePlannedFocusMinutes(customMinutes) ?? 25
        : durationMode;
    setRemainingSeconds(displayMinutes * 60);
  }, [pauseCountdown, durationMode, customMinutes]);

  const handleStart = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setPendingConvertSessionId(null);

    if (!categoryId) {
      setErrorMessage(labels.errors.invalidCategory);
      return;
    }
    if (plannedMinutes <= 0) {
      setErrorMessage(labels.errors.invalidPlannedDuration);
      return;
    }

    setBusy(true);
    setBusyAction("start");
    const result = await createFocusSession({
      categoryId,
      plannedDurationMinutes: plannedMinutes,
      title: title.trim() || null,
      note: note.trim() || null,
      status: "running",
    });
    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      setErrorMessage(resolveFocusError(result.error, labels));
      return;
    }

    setSessionId(result.data.id);
    setPhase("running");
    beginCountdown(plannedMinutes * 60);
  };

  const handlePause = () => {
    if (phase !== "running" || busy) return;
    pauseCountdown();
    setPhase("paused");
  };

  const handleResume = () => {
    if (phase !== "paused" || !hasActiveSession || busy) return;
    beginCountdown(remainingSeconds);
    setPhase("running");
  };

  const handleComplete = async () => {
    if (!sessionId || phase === "setup" || busy) return;

    setBusy(true);
    setBusyAction("complete");
    setErrorMessage(null);
    pauseCountdown();

    const completedId = sessionId;
    const result = await completeFocusSession({
      id: completedId,
      endTime: new Date(),
    });
    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      setErrorMessage(resolveFocusError(result.error, labels));
      if (phase === "paused") {
        return;
      }
      setPhase("running");
      beginCountdown(remainingSeconds);
      return;
    }

    setPendingConvertSessionId(completedId);
    setStatusMessage(labels.successCompleted);
    resetSession();
    router.refresh();
  };

  const handleConvert = async (targetCategoryId?: string) => {
    if (!pendingConvertSessionId || busy) return;

    setBusy(true);
    setBusyAction("convert");
    setErrorMessage(null);

    const result = await convertFocusSessionToTimeBlock({
      id: pendingConvertSessionId,
      defaultTitle: labels.defaultTimeBlockTitle,
      targetCategoryId,
    });

    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      if (result.error === "needs_category") {
        setReassignOpen(true);
        return;
      }
      setErrorMessage(resolveFocusError(result.error, labels));
      return;
    }

    setReassignOpen(false);
    setPendingConvertSessionId(null);
    setStatusMessage(labels.successConverted);
    router.refresh();
  };

  const handleSkipConvert = () => {
    if (busy) return;
    setPendingConvertSessionId(null);
    router.refresh();
  };

  const handleAbandon = async () => {
    if (!sessionId || phase === "setup" || busy) return;

    setBusy(true);
    setBusyAction("abandon");
    setErrorMessage(null);
    pauseCountdown();

    const result = await abandonFocusSession({
      id: sessionId,
      endTime: new Date(),
    });
    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      setErrorMessage(resolveFocusError(result.error, labels));
      return;
    }

    setPendingConvertSessionId(null);
    setStatusMessage(labels.successAbandoned);
    resetSession();
    router.refresh();
  };

  const timeIsUp = phase !== "setup" && remainingSeconds === 0;

  if (!hasCategories && !canOperateWithoutCategories) {
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

  const handleAbandonOrphan = async () => {
    if (!orphanRunningPomodoro || busy) return;

    setBusy(true);
    setBusyAction("abandon");
    setErrorMessage(null);

    const result = await abandonFocusSession({
      id: orphanRunningPomodoro.id,
      endTime: new Date(),
    });

    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      setErrorMessage(resolveFocusError(result.error, labels));
      return;
    }

    setStatusMessage(labels.successAbandoned);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{labels.pomodoroTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {labels.pomodoroSubtitle}
        </p>
      </div>

      {orphanRunningPomodoro ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-950">
              {labels.orphanPomodoroMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-900">
              {orphanRunningPomodoro.title?.trim() || labels.defaultTimeBlockTitle}
              {" · "}
              {orphanRunningPomodoro.categoryName}
              {" · "}
              {orphanRunningPomodoro.plannedDurationMinutes} {labels.minutesUnit}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleAbandonOrphan}
              disabled={busy}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {labelWhenBusy(
                labels.orphanPomodoroAbandon,
                labels.working,
                busy,
                "abandon",
                busyAction,
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {sessionBlocked && phase === "setup" && !orphanRunningPomodoro ? (
        <FocusAlert variant="warning">
          {labels.pomodoroBlockedByOtherSession}
        </FocusAlert>
      ) : null}

      <Card aria-busy={busy}>
        <CardContent className="pt-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {labels.duration}
          </p>
          <div
            role="timer"
            aria-live="polite"
            aria-label={labels.timerAria}
            className="mt-2 break-all font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl"
          >
            {formatFocusCountdown(displaySeconds)}
          </div>
          {timeIsUp ? (
            <p className="mt-3 text-sm text-amber-800">{labels.timeUp}</p>
          ) : null}
          {configLocked ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {labels.sessionActive}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {statusMessage ? (
        <FocusAlert variant="success">{statusMessage}</FocusAlert>
      ) : null}

      {pendingConvertSessionId ? (
        <FocusAlert variant="info">
          <p>{labels.convertPrompt}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              onClick={() => {
                void handleConvert();
              }}
              disabled={busy}
            >
              {labelWhenBusy(
                labels.convertConfirm,
                labels.working,
                busy,
                "convert",
                busyAction,
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipConvert}
              disabled={busy}
            >
              {labels.convertSkip}
            </Button>
          </div>
        </FocusAlert>
      ) : null}

      {errorMessage ? (
        <FocusAlert variant="error">{errorMessage}</FocusAlert>
      ) : null}

      <FocusCategoryReassignmentDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        mode="convert"
        categories={categories}
        pending={busy && busyAction === "convert"}
        labels={{
          categoryRemovedSaveTitle: labels.categoryRemovedSaveTitle,
          categoryRemovedSaveDescription: labels.categoryRemovedSaveDescription,
          categoryRemovedConvertTitle: labels.categoryRemovedConvertTitle,
          categoryRemovedConvertDescription:
            labels.categoryRemovedConvertDescription,
          selectSaveCategory: labels.selectSaveCategory,
          selectCategory: labels.selectCategory,
          finishAndSave: labels.finishAndSave,
          convertWithCategory: labels.convertWithCategory,
          noAvailableCategories: labels.noAvailableCategories,
          createCategoryFirst: labels.createCategoryFirst,
          goToCategories: labels.goToCategories,
          saving: labels.saving,
          converting: labels.converting,
          cancel: cancelLabel,
        }}
        onConfirm={(targetCategoryId) => {
          void handleConvert(targetCategoryId);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.setupTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label htmlFor="pomodoro-category" className="text-sm font-medium">
                {labels.category}
              </label>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={configLocked || busy}
              >
                <SelectTrigger id="pomodoro-category" className="w-full">
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
              <label htmlFor="pomodoro-title" className="text-sm font-medium">
                {labels.titleLabel}
              </label>
              <Input
                id="pomodoro-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={configLocked || busy}
                placeholder={labels.titlePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pomodoro-note" className="text-sm font-medium">
                {labels.noteOptional}
              </label>
              <Textarea
                id="pomodoro-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={configLocked || busy}
                rows={2}
                placeholder={labels.notePlaceholder}
              />
            </div>

            <fieldset disabled={configLocked || busy}>
              <legend className="mb-2 text-sm font-medium">{labels.duration}</legend>
              <div className="flex flex-wrap gap-2">
                {FOCUS_DURATION_PRESETS.map((minutes) => (
                  <Button
                    key={minutes}
                    type="button"
                    size="sm"
                    variant={durationMode === minutes ? "default" : "outline"}
                    onClick={() => setDurationMode(minutes)}
                  >
                    {minutes} {labels.minutesUnit}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={durationMode === "custom" ? "default" : "outline"}
                  onClick={() => setDurationMode("custom")}
                >
                  {labels.durationCustom}
                </Button>
              </div>
              {durationMode === "custom" ? (
                <div className="mt-3 max-w-xs space-y-2">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    aria-invalid={showInvalidDuration}
                  />
                  {showInvalidDuration ? (
                    <p className="text-sm text-amber-800" role="alert">
                      {labels.invalidDurationHint}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleStart}
          disabled={
            busy ||
            configLocked ||
            plannedMinutes <= 0 ||
            sessionBlocked ||
            orphanRunningPomodoro !== null ||
            !hasCategories
          }
        >
          {labelWhenBusy(labels.start, labels.working, busy, "start", busyAction)}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handlePause}
          disabled={busy || phase !== "running"}
        >
          {labels.pause}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleResume}
          disabled={busy || phase !== "paused"}
        >
          {labels.resume}
        </Button>
        <Button
          type="button"
          onClick={handleComplete}
          disabled={busy || !hasActiveSession || phase === "setup"}
        >
          {labelWhenBusy(
            labels.complete,
            labels.working,
            busy,
            "complete",
            busyAction,
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleAbandon}
          disabled={busy || !hasActiveSession || phase === "setup"}
          className="text-muted-foreground"
        >
          {labelWhenBusy(
            labels.abandon,
            labels.working,
            busy,
            "abandon",
            busyAction,
          )}
        </Button>
      </div>
    </div>
  );
}

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

type Props = {
  categories: FocusCategoryOption[];
  labels: Dictionary["focus"];
  /** Another focus session (e.g. stopwatch) is already running in the DB. */
  sessionBlocked?: boolean;
};

const inputClass =
  "w-full rounded border border-zinc-300 px-3 py-2 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

const primaryBtn =
  "w-full min-h-11 rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-0 sm:py-2";

const secondaryBtn =
  "w-full min-h-11 rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-0 sm:py-2";

function resolveFocusError(
  error: FocusSessionActionError | undefined,
  labels: Dictionary["focus"],
): string {
  if (!error) return labels.errors.generic;
  const key = error as keyof Dictionary["focus"]["errors"];
  return labels.errors[key] ?? labels.errors.generic;
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

export function FocusTimer({ categories, labels, sessionBlocked = false }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<TimerPhase>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingConvertSessionId, setPendingConvertSessionId] = useState<
    string | null
  >(null);
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

  const handleConvert = async () => {
    if (!pendingConvertSessionId || busy) return;

    setBusy(true);
    setBusyAction("convert");
    setErrorMessage(null);

    const result = await convertFocusSessionToTimeBlock({
      id: pendingConvertSessionId,
      defaultTitle: labels.defaultTimeBlockTitle,
    });

    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      setErrorMessage(resolveFocusError(result.error, labels));
      return;
    }

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

  if (!hasCategories) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-950">
          {labels.emptyNoCategoriesTitle}
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          {labels.needCategoryPrefix}{" "}
          <Link href="/categories" className="font-medium underline">
            {labels.categoriesLink}
          </Link>
          {labels.needCategorySuffix}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {sessionBlocked && phase === "setup" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {labels.pomodoroBlockedByOtherSession}
        </p>
      ) : null}

      <section
        className="rounded-lg border border-zinc-200 bg-white p-4 text-center sm:p-6"
        aria-busy={busy}
      >
        <p className="text-sm font-medium text-zinc-500">{labels.duration}</p>
        <div
          role="timer"
          aria-live="polite"
          aria-label={labels.timerAria}
          className="mt-2 break-all font-mono text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl md:text-7xl"
        >
          {formatFocusCountdown(displaySeconds)}
        </div>
        {timeIsUp ? (
          <p className="mt-3 text-sm text-amber-800">{labels.timeUp}</p>
        ) : null}
        {configLocked ? (
          <p className="mt-2 text-sm text-zinc-500">{labels.sessionActive}</p>
        ) : null}
      </section>

      {statusMessage ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          {statusMessage}
        </div>
      ) : null}

      {pendingConvertSessionId ? (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-950">{labels.convertPrompt}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={handleConvert}
              disabled={busy}
              className={primaryBtn}
            >
              {labelWhenBusy(
                labels.convertConfirm,
                labels.working,
                busy,
                "convert",
                busyAction,
              )}
            </button>
            <button
              type="button"
              onClick={handleSkipConvert}
              disabled={busy}
              className={secondaryBtn}
            >
              {labels.convertSkip}
            </button>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">{labels.pomodoroTitle}</h2>
        <p className="mb-4 text-sm text-zinc-600">{labels.pomodoroSubtitle}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">{labels.category}</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={configLocked || busy}
              className={inputClass}
            >
              <option value="">{labels.selectCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">{labels.titleLabel}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={configLocked || busy}
              className={inputClass}
              placeholder={labels.titlePlaceholder}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">{labels.noteOptional}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={configLocked || busy}
              rows={2}
              className={inputClass}
              placeholder={labels.notePlaceholder}
            />
          </label>

          <fieldset className="sm:col-span-2" disabled={configLocked || busy}>
            <legend className="mb-2 text-sm font-medium">{labels.duration}</legend>
            <div className="flex flex-wrap gap-2">
              {FOCUS_DURATION_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDurationMode(minutes)}
                  className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    durationMode === minutes
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  {minutes} {labels.minutesUnit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDurationMode("custom")}
                className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  durationMode === "custom"
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {labels.durationCustom}
              </button>
            </div>
            {durationMode === "custom" ? (
              <div className="mt-3 max-w-xs">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-600">{labels.durationCustom}</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className={inputClass}
                    aria-invalid={showInvalidDuration}
                  />
                </label>
                {showInvalidDuration ? (
                  <p className="mt-1 text-sm text-amber-800" role="alert">
                    {labels.invalidDurationHint}
                  </p>
                ) : null}
              </div>
            ) : null}
          </fieldset>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={busy || configLocked || plannedMinutes <= 0 || sessionBlocked}
          className={primaryBtn}
        >
          {labelWhenBusy(labels.start, labels.working, busy, "start", busyAction)}
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={busy || phase !== "running"}
          className={secondaryBtn}
        >
          {labels.pause}
        </button>
        <button
          type="button"
          onClick={handleResume}
          disabled={busy || phase !== "paused"}
          className={secondaryBtn}
        >
          {labels.resume}
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={busy || !hasActiveSession || phase === "setup"}
          className={primaryBtn}
        >
          {labelWhenBusy(
            labels.complete,
            labels.working,
            busy,
            "complete",
            busyAction,
          )}
        </button>
        <button
          type="button"
          onClick={handleAbandon}
          disabled={busy || !hasActiveSession || phase === "setup"}
          className="col-span-2 w-full min-h-11 rounded border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1 sm:w-auto sm:min-h-0 sm:py-2"
        >
          {labelWhenBusy(
            labels.abandon,
            labels.working,
            busy,
            "abandon",
            busyAction,
          )}
        </button>
      </div>
    </div>
  );
}

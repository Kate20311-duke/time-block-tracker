"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ElapsedTimer } from "@/components/elapsed-timer";
import {
  cancelStopwatch,
  completeStopwatchAndCreateTimeBlock,
  startStopwatch,
} from "@/lib/actions/focus-sessions";
import type { FocusSessionActionError } from "@/lib/actions/focus-shared";
import type { FocusCategoryOption } from "@/components/focus-timer";
import type { Dictionary } from "@/lib/i18n/types";
import { formatDateTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/types";

export type RunningStopwatchSession = {
  id: string;
  title: string | null;
  note: string | null;
  startTime: string;
  category: { id: string; name: string; color: string };
};

type Props = {
  categories: FocusCategoryOption[];
  labels: Dictionary["focus"];
  locale: Locale;
  initialRunningSession: RunningStopwatchSession | null;
  anotherSessionRunning: boolean;
};

type BusyAction = "start" | "end" | "cancel" | null;

const inputClass =
  "w-full rounded border border-zinc-300 px-3 py-2 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

const primaryBtn =
  "w-full min-h-11 rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-0 sm:py-2";

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

export function StopwatchTimer({
  categories,
  labels,
  locale,
  initialRunningSession,
  anotherSessionRunning,
}: Props) {
  const router = useRouter();
  const [runningSession, setRunningSession] =
    useState<RunningStopwatchSession | null>(initialRunningSession);
  const [categoryId, setCategoryId] = useState(
    initialRunningSession?.category.id ?? "",
  );
  const [title, setTitle] = useState(initialRunningSession?.title ?? "");
  const [note, setNote] = useState(initialRunningSession?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isRunning = runningSession !== null;
  const configLocked = isRunning;
  const hasCategories = categories.length > 0;

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
      setErrorMessage(resolveFocusError(result.error, labels));
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
      startTime: new Date().toISOString(),
      category: { id: category.id, name: category.name, color: category.color },
    });
    router.refresh();
  };

  const handleEndAndSave = async () => {
    if (!runningSession || busy) return;

    setBusy(true);
    setBusyAction("end");
    setErrorMessage(null);

    const result = await completeStopwatchAndCreateTimeBlock({
      id: runningSession.id,
      defaultTitle: labels.stopwatchDefaultTimeBlockTitle,
    });

    setBusy(false);
    setBusyAction(null);

    if (!result.ok) {
      setErrorMessage(resolveFocusError(result.error, labels));
      return;
    }

    setRunningSession(null);
    setStatusMessage(labels.stopwatchSuccessSaved);
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
      setErrorMessage(resolveFocusError(result.error, labels));
      return;
    }

    setRunningSession(null);
    setStatusMessage(labels.stopwatchSuccessCanceled);
    router.refresh();
  };

  if (!hasCategories) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{labels.stopwatchTitle}</h2>
        <p className="mt-1 text-sm text-zinc-600">{labels.stopwatchSubtitle}</p>
      </div>

      {anotherSessionRunning && !isRunning ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {labels.stopwatchBlockedByOtherSession}
        </p>
      ) : null}

      {statusMessage ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {errorMessage}
        </div>
      ) : null}

      {isRunning && runningSession ? (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
          <p className="text-sm font-medium text-zinc-500">
            {labels.stopwatchModeLabel}
          </p>
          <ElapsedTimer
            startTimeIso={runningSession.startTime}
            ariaLabel={labels.stopwatchTimerAria}
            className="break-all font-mono text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl"
          />
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">{labels.titleLabel}</dt>
              <dd className="font-medium text-zinc-900">
                {runningSession.title?.trim() || labels.stopwatchUntitled}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">{labels.category}</dt>
              <dd className="flex items-center gap-2 font-medium text-zinc-900">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: runningSession.category.color }}
                  aria-hidden
                />
                {runningSession.category.name}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">{labels.stopwatchStartedAt}</dt>
              <dd className="font-medium text-zinc-900">
                {formatDateTime(new Date(runningSession.startTime), locale)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleEndAndSave}
              disabled={busy}
              className={primaryBtn}
            >
              {labelWhenBusy(
                labels.stopwatchEndAndSave,
                labels.working,
                busy,
                "end",
                busyAction,
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="w-full min-h-11 rounded border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-h-0 sm:py-2"
            >
              {labelWhenBusy(
                labels.stopwatchCancel,
                labels.working,
                busy,
                "cancel",
                busyAction,
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">{labels.category}</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={configLocked || busy || anotherSessionRunning}
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
                disabled={configLocked || busy || anotherSessionRunning}
                className={inputClass}
                placeholder={labels.stopwatchTitlePlaceholder}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">{labels.noteOptional}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={configLocked || busy || anotherSessionRunning}
                rows={2}
                className={inputClass}
                placeholder={labels.notePlaceholder}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={busy || anotherSessionRunning}
            className={primaryBtn}
          >
            {labelWhenBusy(
              labels.stopwatchStart,
              labels.working,
              busy,
              "start",
              busyAction,
            )}
          </button>
        </>
      )}

      {!hasCategories ? (
        <p className="text-sm text-zinc-600">
          {labels.needCategoryPrefix}{" "}
          <Link href="/categories" className="font-medium underline">
            {labels.categoriesLink}
          </Link>
          {labels.needCategorySuffix}
        </p>
      ) : null}
    </section>
  );
}

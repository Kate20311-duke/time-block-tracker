"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AssistantSourceNotice } from "@/components/assistant/assistant-source-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { readAssistantApiError } from "@/lib/assistant/api-error-client";
import type {
  TomorrowPlanApplyResult,
  TomorrowPlanSkipReason,
} from "@/lib/assistant/tomorrow-plan-apply-types";
import { MAX_APPLY_BLOCKS } from "@/lib/assistant/tomorrow-plan-apply-types";
import {
  filterBlocksByKeys,
  formatSelectedPlanPlainText,
} from "@/lib/assistant/tomorrow-plan-copy";
import type {
  ExistingTomorrowBlock,
  TomorrowPlanResponse,
  TomorrowRoutineBlock,
} from "@/lib/assistant/tomorrow-plan-types";
import {
  USER_GOAL_MAX_LENGTH,
  USER_GOAL_MIN_LENGTH,
} from "@/lib/assistant/tomorrow-plan-types";
import {
  formatDisplayBusySources,
  getAvailableWindows,
  mergeBusyBlocksForDisplay,
} from "@/lib/assistant/tomorrow-plan-busy-display";
import {
  formatPlanBlockLine,
  formatPlanTimeRange,
  getAllSuggestedBlockKeys,
  getSuggestedBlockKey,
  getTomorrowCalendarUrl,
  mergeCreatedBlocksIntoExisting,
} from "@/lib/assistant/tomorrow-plan-ui";
import { formatMessage } from "@/lib/i18n";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type Props = {
  labels: Dictionary["assistant"];
  locale: Locale;
  timeZone: string;
};

function confidenceLabel(
  confidence: "low" | "medium" | "high",
  labels: Dictionary["assistant"],
): string {
  if (confidence === "low") return labels.tomorrowPlanConfidenceLow;
  if (confidence === "high") return labels.tomorrowPlanConfidenceHigh;
  return labels.tomorrowPlanConfidenceMedium;
}

function skipReasonLabel(
  reason: TomorrowPlanSkipReason,
  labels: Dictionary["assistant"],
): string {
  switch (reason) {
    case "conflict_existing":
      return labels.tomorrowPlanSkipReasonConflictExisting;
    case "conflict_routine":
      return labels.tomorrowPlanSkipReasonConflictRoutine;
    case "conflict_batch":
      return labels.tomorrowPlanSkipReasonConflictBatch;
    case "duplicate":
      return labels.tomorrowPlanSkipReasonDuplicate;
    case "not_tomorrow":
      return labels.tomorrowPlanSkipReasonNotTomorrow;
    case "invalid_duration":
      return labels.tomorrowPlanSkipReasonInvalidDuration;
    case "invalid_category":
      return labels.tomorrowPlanSkipReasonInvalidCategory;
    case "invalid_fields":
    default:
      return labels.tomorrowPlanSkipReasonInvalidFields;
  }
}

function formatSkippedBlockLine(
  block: TomorrowPlanApplyResult["skippedBlocks"][number],
  labels: Dictionary["assistant"],
  locale: Locale,
  timeZone: string,
): string {
  const reason = skipReasonLabel(block.reason, labels);
  if (block.startTime && block.endTime) {
    return `${formatPlanBlockLine(
      {
        title: block.title,
        startTime: block.startTime,
        endTime: block.endTime,
      },
      locale,
      timeZone,
    )}：${reason}`;
  }
  return `${block.title}：${reason}`;
}

export function TomorrowPlanSection({ labels, locale, timeZone }: Props) {
  const [userGoal, setUserGoal] = useState("");
  const [generatedGoal, setGeneratedGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TomorrowPlanResponse | null>(null);
  const [displayExistingBlocks, setDisplayExistingBlocks] = useState<
    ExistingTomorrowBlock[]
  >([]);
  const [displayRoutineBlocks, setDisplayRoutineBlocks] = useState<
    TomorrowRoutineBlock[]
  >([]);
  const [selectedBlockKeys, setSelectedBlockKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [appliedBlockKeys, setAppliedBlockKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<TomorrowPlanApplyResult | null>(
    null,
  );
  const [applyError, setApplyError] = useState<string | null>(null);
  const requestingRef = useRef(false);
  const applyingRef = useRef(false);

  const goalDirty =
    result !== null &&
    generatedGoal !== null &&
    userGoal.trim() !== generatedGoal;

  const suggestedBlocks = useMemo(
    () => result?.plan.suggestedBlocks ?? [],
    [result?.plan.suggestedBlocks],
  );

  const displayBusyBlocks = useMemo(
    () =>
      mergeBusyBlocksForDisplay({
        existingBlocks: displayExistingBlocks,
        routineBlocks: displayRoutineBlocks,
      }),
    [displayExistingBlocks, displayRoutineBlocks],
  );

  const hasRoutineInBusyDisplay = useMemo(
    () => displayBusyBlocks.some((block) => block.sources.includes("routine")),
    [displayBusyBlocks],
  );

  const busySourceLabels = useMemo(
    () => ({
      calendar: labels.tomorrowPlanAvoidSourceCalendar,
      routine: labels.tomorrowPlanAvoidSourceRoutine,
      both: labels.tomorrowPlanAvoidSourceBoth,
    }),
    [labels],
  );

  const availableWindows = useMemo(() => {
    if (!result?.date) {
      return [];
    }
    return getAvailableWindows({
      busyBlocks: displayBusyBlocks,
      date: result.date,
      timeZone,
    });
  }, [displayBusyBlocks, result, timeZone]);

  const totalCount = suggestedBlocks.length;
  const selectedCount = selectedBlockKeys.size;

  const selectableBlocks = useMemo(
    () =>
      suggestedBlocks.filter(
        (block) => !appliedBlockKeys.has(getSuggestedBlockKey(block)),
      ),
    [appliedBlockKeys, suggestedBlocks],
  );
  const selectableCount = selectableBlocks.length;
  const appliedCount = totalCount - selectableCount;
  const allSelectableSelected =
    selectableCount > 0 && selectedCount === selectableCount;
  const noneSelected = selectedCount === 0;
  const allApplied = totalCount > 0 && appliedCount === totalCount;

  const selectedBlocks = useMemo(
    () =>
      filterBlocksByKeys(suggestedBlocks, selectedBlockKeys).filter(
        (block) => !appliedBlockKeys.has(getSuggestedBlockKey(block)),
      ),
    [appliedBlockKeys, selectedBlockKeys, suggestedBlocks],
  );
  const tooManySelected = selectedBlocks.length > MAX_APPLY_BLOCKS;

  const goalValidationError = useMemo(() => {
    const trimmed = userGoal.trim();
    if (trimmed.length < USER_GOAL_MIN_LENGTH) {
      return labels.tomorrowPlanGoalErrorTooShort;
    }
    if (trimmed.length > USER_GOAL_MAX_LENGTH) {
      return labels.tomorrowPlanGoalErrorTooLong;
    }
    return null;
  }, [labels, userGoal]);

  const calendarUrl = useMemo(
    () =>
      getTomorrowCalendarUrl(result?.date ?? "", applyResult?.calendarUrl),
    [applyResult?.calendarUrl, result?.date],
  );

  const validateGoal = useCallback(
    (value: string): string | null => {
      const trimmed = value.trim();
      if (trimmed.length < USER_GOAL_MIN_LENGTH) {
        return labels.tomorrowPlanGoalErrorTooShort;
      }
      if (trimmed.length > USER_GOAL_MAX_LENGTH) {
        return labels.tomorrowPlanGoalErrorTooLong;
      }
      return null;
    },
    [labels],
  );

  const handleGenerate = useCallback(async () => {
    if (requestingRef.current) return;

    const validationError = validateGoal(userGoal);
    if (validationError) {
      setError(validationError);
      return;
    }

    requestingRef.current = true;
    setLoading(true);
    setError(null);

    const trimmedGoal = userGoal.trim();

    try {
      const response = await fetch("/api/assistant/tomorrow-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userGoal: trimmedGoal }),
      });

      if (!response.ok) {
        setError(
          await readAssistantApiError(
            response,
            labels,
            labels.tomorrowPlanErrorFailed,
          ),
        );
        return;
      }

      const data = (await response.json()) as TomorrowPlanResponse;
      setResult(data);
      setGeneratedGoal(trimmedGoal);
      setDisplayExistingBlocks(data.existingBlocks);
      setDisplayRoutineBlocks(data.routineBlocks ?? []);
      setApplyResult(null);
      setApplyError(null);
      setAppliedBlockKeys(new Set());
      setSelectedBlockKeys(
        new Set(getAllSuggestedBlockKeys(data.plan.suggestedBlocks)),
      );
    } catch {
      setError(labels.tomorrowPlanErrorFailed);
    } finally {
      requestingRef.current = false;
      setLoading(false);
    }
  }, [labels, userGoal, validateGoal]);

  const toggleBlock = useCallback((key: string, checked: boolean) => {
    if (appliedBlockKeys.has(key)) return;

    setSelectedBlockKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [appliedBlockKeys]);

  const selectAll = useCallback(() => {
    setSelectedBlockKeys(new Set(getAllSuggestedBlockKeys(selectableBlocks)));
  }, [selectableBlocks]);

  const deselectAll = useCallback(() => {
    setSelectedBlockKeys(new Set());
  }, []);

  const handleApplyToCalendar = useCallback(async () => {
    if (
      applyingRef.current ||
      isApplying ||
      selectedBlocks.length === 0 ||
      allApplied ||
      tooManySelected
    ) {
      return;
    }

    const confirmed = window.confirm(
      formatMessage(labels.tomorrowPlanApplyConfirm, {
        count: String(selectedBlocks.length),
      }),
    );
    if (!confirmed) return;

    applyingRef.current = true;
    setIsApplying(true);
    setApplyError(null);
    setApplyResult(null);

    try {
      const response = await fetch("/api/assistant/tomorrow-plan/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: selectedBlocks.map((block) => ({
            title: block.title,
            categoryId: block.categoryId,
            categoryName: block.categoryName,
            startTime: block.startTime,
            endTime: block.endTime,
          })),
        }),
      });

      if (!response.ok) {
        setApplyError(
          await readAssistantApiError(
            response,
            labels,
            labels.tomorrowPlanApplyErrorFailed,
          ),
        );
        return;
      }

      const data = (await response.json()) as TomorrowPlanApplyResult;
      const createdKeys = data.createdBlocks.map((block) =>
        getSuggestedBlockKey(block),
      );
      const skippedKeys = data.skippedBlocks
        .filter(
          (block): block is typeof block & { startTime: string; endTime: string } =>
            Boolean(block.startTime && block.endTime),
        )
        .map((block) => getSuggestedBlockKey(block));

      setApplyResult(data);
      setAppliedBlockKeys((prev) => {
        const next = new Set(prev);
        for (const key of createdKeys) next.add(key);
        return next;
      });
      setSelectedBlockKeys((prev) => {
        const next = new Set(prev);
        for (const key of createdKeys) next.delete(key);
        for (const key of skippedKeys) next.delete(key);
        return next;
      });
      setDisplayExistingBlocks((prev) =>
        mergeCreatedBlocksIntoExisting(prev, data.createdBlocks),
      );

      if (data.createdCount > 0) {
        toast.success(
          formatMessage(labels.tomorrowPlanApplySuccess, {
            count: String(data.createdCount),
          }),
        );
      }
    } catch {
      setApplyError(labels.tomorrowPlanApplyErrorFailed);
    } finally {
      applyingRef.current = false;
      setIsApplying(false);
    }
  }, [allApplied, isApplying, labels, selectedBlocks, tooManySelected]);

  const handleCopySelected = useCallback(async () => {
    if (!result || !generatedGoal || selectedBlocks.length === 0) return;

    try {
      const text = formatSelectedPlanPlainText({
        date: result.date,
        generatedGoal,
        blocks: selectedBlocks,
        labels,
        locale,
        timeZone,
      });
      await navigator.clipboard.writeText(text);
      toast.success(labels.tomorrowPlanCopySelectedSuccess);
    } catch {
      toast.error(labels.tomorrowPlanCopySelectedFailed);
    }
  }, [
    generatedGoal,
    labels,
    locale,
    result,
    selectedBlocks,
    timeZone,
  ]);

  const generateButtonLabel = result
    ? labels.tomorrowPlanRegenerateButton
    : labels.tomorrowPlanGenerateButton;

  const applyButtonLabel = (() => {
    if (isApplying) return labels.tomorrowPlanApplying;
    if (allApplied) return labels.tomorrowPlanAllApplied;
    if (tooManySelected) return labels.tomorrowPlanApplyTooManyBlocks;
    if (noneSelected) return labels.tomorrowPlanSelectItemsHint;
    return labels.tomorrowPlanAddToCalendar;
  })();

  const applyButtonDisabled =
    loading ||
    isApplying ||
    noneSelected ||
    allApplied ||
    tooManySelected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" aria-hidden />
          {labels.tomorrowPlanTitle}
        </CardTitle>
        <CardDescription>{labels.tomorrowPlanDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {labels.tomorrowPlanDraftNote}
        </p>

        <div className="space-y-2">
          <label htmlFor="tomorrow-plan-goal" className="text-sm font-medium">
            {labels.tomorrowPlanGoalLabel}
          </label>
          <Textarea
            id="tomorrow-plan-goal"
            value={userGoal}
            onChange={(event) => {
              setUserGoal(event.target.value);
              if (error) setError(null);
            }}
            placeholder={labels.tomorrowPlanGoalPlaceholder}
            disabled={loading}
            rows={3}
            maxLength={USER_GOAL_MAX_LENGTH}
          />
          <p className="text-xs text-muted-foreground">
            {userGoal.trim().length}/{USER_GOAL_MAX_LENGTH}
          </p>
        </div>

        {goalDirty ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
            {labels.tomorrowPlanGoalChangedNotice}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={
              loading || isApplying || goalValidationError !== null
            }
            className="w-full sm:w-fit"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                {labels.tomorrowPlanGenerating}
              </>
            ) : (
              generateButtonLabel
            )}
          </Button>

          {error ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={
                loading || isApplying || goalValidationError !== null
              }
              className="w-full sm:w-fit"
            >
              {labels.retryButton}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {labels.tomorrowPlanGenerating}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-5 border-t border-border pt-5">
            <AssistantSourceNotice source={result.source} labels={labels} />

            {displayBusyBlocks.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  {labels.tomorrowPlanAvoidTimesTitle}
                </h3>
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm text-muted-foreground">
                  {displayBusyBlocks.map((block) => (
                    <li key={block.key} className="break-words">
                      {formatPlanTimeRange(
                        block.startTime,
                        block.endTime,
                        locale,
                        timeZone,
                      )}{" "}
                      {block.title}
                      <span className="ml-1 text-xs">
                        （
                        {formatDisplayBusySources(
                          block.sources,
                          busySourceLabels,
                        )}
                        ）
                      </span>
                    </li>
                  ))}
                </ul>
                {hasRoutineInBusyDisplay ? (
                  <p className="text-xs text-muted-foreground">
                    {labels.tomorrowPlanRoutineReferenceNote}
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className="text-sm font-medium">
                {labels.tomorrowPlanAvailableWindowsTitle}
              </h3>
              {availableWindows.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {availableWindows.map((window) => (
                    <li
                      key={`${window.startTime}-${window.endTime}`}
                      className="break-words"
                    >
                      {formatPlanTimeRange(
                        window.startTime,
                        window.endTime,
                        locale,
                        timeZone,
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {labels.tomorrowPlanNoAvailableWindows}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {labels.tomorrowPlanAvailableWindowsNote}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">
                {labels.tomorrowPlanSummarySection}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {result.plan.summary}
              </p>
            </section>

            {result.plan.assumptions.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  {labels.tomorrowPlanAssumptionsSection}
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.plan.assumptions.map((item, index) => (
                    <li key={`assumption-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {totalCount > 0 ? (
              <section className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-medium">
                    {labels.tomorrowPlanSuggestedBlocksSection}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {noneSelected
                      ? labels.tomorrowPlanNoneSelected
                      : formatMessage(labels.tomorrowPlanSelectedCount, {
                          selected: String(selectedCount),
                          total: String(totalCount),
                        })}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {selectableCount > 0 && !allSelectableSelected ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                      disabled={loading || isApplying}
                      className="w-full sm:w-auto"
                    >
                      {labels.tomorrowPlanSelectAll}
                    </Button>
                  ) : null}
                  {selectedCount > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAll}
                      disabled={loading || isApplying}
                      className="w-full sm:w-auto"
                    >
                      {labels.tomorrowPlanDeselectAll}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopySelected}
                    disabled={loading || isApplying || noneSelected}
                    className="w-full sm:w-auto"
                  >
                    <Copy aria-hidden />
                    {labels.tomorrowPlanCopySelected}
                  </Button>
                </div>

                <ol className="space-y-3">
                  {suggestedBlocks.map((block, index) => {
                    const blockKey = getSuggestedBlockKey(block);
                    const isApplied = appliedBlockKeys.has(blockKey);
                    const checked = selectedBlockKeys.has(blockKey);
                    const inputId = `tomorrow-plan-block-${index}`;

                    return (
                      <li key={blockKey}>
                        <label
                          htmlFor={inputId}
                          className={`flex gap-3 rounded-lg border px-4 py-3 transition-colors ${
                            isApplied
                              ? "cursor-default border-emerald-500/30 bg-emerald-500/5"
                              : checked
                                ? "cursor-pointer border-primary/30 bg-primary/5"
                                : "cursor-pointer border-border bg-muted/30"
                          }`}
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={checked}
                            disabled={loading || isApplying || isApplied}
                            onChange={(event) =>
                              toggleBlock(blockKey, event.target.checked)
                            }
                            className="mt-1 size-4 shrink-0 rounded border-input accent-primary disabled:cursor-not-allowed"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">
                                {formatPlanTimeRange(
                                  block.startTime,
                                  block.endTime,
                                  locale,
                                  timeZone,
                                )}
                              </p>
                              {isApplied ? (
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                >
                                  <CheckCircle2 className="size-3" aria-hidden />
                                  {labels.tomorrowPlanAppliedBadge}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="break-words text-sm">{block.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {labels.tomorrowPlanCategoryLabel}：
                              {block.categoryName ??
                                labels.tomorrowPlanNoCategory}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {labels.tomorrowPlanReasonLabel}：{block.reason}
                            </p>
                            {!isApplied ? (
                              <Badge variant="outline" className="mt-1">
                                {labels.tomorrowPlanConfidenceLabel}：
                                {confidenceLabel(block.confidence, labels)}
                              </Badge>
                            ) : null}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}

            <section className="space-y-4 rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  {labels.tomorrowPlanPreviewTitle}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {labels.tomorrowPlanPreviewNote}
                </p>
              </div>

              {noneSelected ? (
                <p className="text-sm text-muted-foreground">
                  {labels.tomorrowPlanPreviewEmpty}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {selectedBlocks.map((block) => (
                    <li
                      key={getSuggestedBlockKey(block)}
                      className="break-words rounded-md bg-background px-3 py-2 ring-1 ring-border"
                    >
                      {formatPlanBlockLine(block, locale, timeZone)} ·{" "}
                      {block.categoryName ?? labels.tomorrowPlanNoCategory}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col gap-3 pt-1">
                <Button
                  type="button"
                  onClick={handleApplyToCalendar}
                  disabled={applyButtonDisabled}
                  className="w-full sm:w-fit"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden />
                      {applyButtonLabel}
                    </>
                  ) : (
                    applyButtonLabel
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {labels.tomorrowPlanAddToCalendarHint}
                </p>

                {applyError ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                  >
                    {applyError}
                  </p>
                ) : null}

                {applyResult ? (
                  <div
                    className="space-y-4 rounded-lg border border-border bg-background p-4 text-sm"
                    aria-live="polite"
                  >
                    {applyResult.createdCount > 0 ? (
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          {formatMessage(labels.tomorrowPlanApplySuccess, {
                            count: String(applyResult.createdCount),
                          })}
                        </p>
                        <p className="text-muted-foreground">
                          {labels.tomorrowPlanCalendarUpdated}
                        </p>
                        <ul className="space-y-1.5 text-muted-foreground">
                          {applyResult.createdBlocks.map((block) => (
                            <li
                              key={block.id}
                              className="break-words rounded-md bg-muted/40 px-3 py-2"
                            >
                              {formatPlanBlockLine(block, locale, timeZone)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : applyResult.skippedCount > 0 ? (
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {labels.tomorrowPlanApplyNoneAdded}
                        </p>
                        <p className="text-muted-foreground">
                          {labels.tomorrowPlanApplyNoneAddedDetail}
                        </p>
                      </div>
                    ) : null}

                    {applyResult.skippedCount > 0 ? (
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          {formatMessage(labels.tomorrowPlanApplySkippedHeader, {
                            count: String(applyResult.skippedCount),
                          })}
                        </p>
                        <ul className="space-y-1.5 text-muted-foreground">
                          {applyResult.skippedBlocks.map((block, index) => (
                            <li
                              key={`skipped-${index}`}
                              className="break-words rounded-md bg-muted/40 px-3 py-2"
                            >
                              {formatSkippedBlockLine(
                                block,
                                labels,
                                locale,
                                timeZone,
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {applyResult.createdCount > 0 ? (
                      <Button asChild className="w-full sm:w-fit">
                        <Link href={calendarUrl}>
                          <ExternalLink aria-hidden />
                          {labels.tomorrowPlanViewTomorrowCalendar}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            {result.plan.warnings.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">
                  {labels.tomorrowPlanWarningsSection}
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.plan.warnings.map((item, index) => (
                    <li key={`warning-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

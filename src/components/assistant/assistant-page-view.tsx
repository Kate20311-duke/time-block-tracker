"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { AssistantEmptyState } from "@/components/assistant/assistant-empty-state";
import {
  resolveRangeFromState,
  ReviewRangeSelector,
  validateRangeState,
  type ReviewRangeState,
} from "@/components/assistant/review-range-selector";
import { WeeklyReviewCard } from "@/components/assistant/weekly-review-card";
import { ReviewScopeNote } from "@/components/review/review-scope-note";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  rangesEqual,
  resolvePresetRange,
  type ReviewRangeParams,
} from "@/lib/assistant/time-review-range";
import type { TimeReviewResponse } from "@/lib/assistant/weekly-review-types";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type Props = {
  labels: Dictionary["assistant"];
  locale: Locale;
  timeZone: string;
};

function createInitialRangeState(timeZone: string): ReviewRangeState {
  const last7 = resolvePresetRange("last7", timeZone);
  return {
    preset: "last7",
    customStart: last7.startDate,
    customEnd: last7.endDate,
  };
}

export function AssistantPageView({ labels, locale, timeZone }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TimeReviewResponse | null>(null);
  const [empty, setEmpty] = useState(false);
  const [rangeState, setRangeState] = useState<ReviewRangeState>(() =>
    createInitialRangeState(timeZone),
  );
  const [rangeValidationError, setRangeValidationError] = useState<string | null>(
    null,
  );
  const [appliedRange, setAppliedRange] = useState<ReviewRangeParams | null>(
    null,
  );
  const requestingRef = useRef(false);

  const currentRange = useMemo(
    () => resolveRangeFromState(rangeState, timeZone),
    [rangeState, timeZone],
  );

  const rangeDirty =
    result !== null &&
    appliedRange !== null &&
    !rangesEqual(currentRange, appliedRange);

  const handleGenerate = useCallback(async () => {
    if (requestingRef.current) return;

    const validationMessage = validateRangeState(rangeState, timeZone, labels);
    if (validationMessage) {
      setRangeValidationError(validationMessage);
      return;
    }

    requestingRef.current = true;
    const isRegenerating = result !== null;
    setLoading(true);
    setError(null);
    setEmpty(false);

    if (!isRegenerating) {
      setResult(null);
      setAppliedRange(null);
    }

    const range = resolveRangeFromState(rangeState, timeZone);

    try {
      const response = await fetch("/api/assistant/time-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate,
        }),
      });

      if (response.status === 401) {
        setError(labels.errorUnauthorized);
        return;
      }

      if (!response.ok) {
        setError(labels.errorFailed);
        return;
      }

      const data = (await response.json()) as TimeReviewResponse;

      if (
        data.summary.dataQuality.level === "empty" ||
        data.summary.totalRecordedMinutes === 0
      ) {
        setResult(null);
        setAppliedRange(range);
        setEmpty(true);
        return;
      }

      setResult(data);
      setAppliedRange(range);
    } catch {
      setError(labels.errorFailed);
    } finally {
      requestingRef.current = false;
      setLoading(false);
    }
  }, [labels, rangeState, result, timeZone]);

  const generateButtonLabel = result
    ? labels.regenerateButton
    : labels.generateButton;

  const generateDisabled = loading || rangeValidationError !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {labels.pageTitle}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {labels.pageDescription}
        </p>
      </div>

      <ReviewScopeNote label={labels.introScopeNote} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {labels.generateCardTitle}
          </CardTitle>
          <CardDescription>{labels.generateCardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ReviewRangeSelector
            labels={labels}
            timeZone={timeZone}
            value={rangeState}
            onChange={setRangeState}
            validationError={rangeValidationError}
            onValidationError={setRangeValidationError}
            disabled={loading}
          />

          {rangeDirty ? (
            <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              {labels.rangeChangedNotice}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generateDisabled}
              className="w-fit"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  {labels.generating}
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
                disabled={generateDisabled}
                className="w-fit"
              >
                {labels.retryButton}
              </Button>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {labels.generating}
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

          {empty ? (
            <AssistantEmptyState
              labels={{
                emptyTitle: labels.emptyTitle,
                emptyDescription: labels.emptyDescription,
                goRecordTimeBlocks: labels.goRecordTimeBlocks,
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <WeeklyReviewCard
          response={result}
          labels={labels}
          locale={locale}
          loading={loading}
        />
      ) : null}
    </div>
  );
}

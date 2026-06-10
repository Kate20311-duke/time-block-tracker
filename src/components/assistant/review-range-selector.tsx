"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_TIME_REVIEW_RANGE_DAYS,
  resolvePresetRange,
  validateReviewRangeParams,
  type ReviewRangeParams,
  type ReviewRangePreset,
} from "@/lib/assistant/time-review-range";
import type { Dictionary } from "@/lib/i18n/types";

export type ReviewRangeState = {
  preset: ReviewRangePreset;
  customStart: string;
  customEnd: string;
};

type Props = {
  labels: Dictionary["assistant"];
  timeZone: string;
  value: ReviewRangeState;
  onChange: (next: ReviewRangeState) => void;
  validationError: string | null;
  onValidationError: (message: string | null) => void;
  disabled?: boolean;
};

const PRESETS: ReviewRangePreset[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "custom",
];

export function resolveRangeFromState(
  state: ReviewRangeState,
  timeZone: string,
): ReviewRangeParams {
  if (state.preset !== "custom") {
    return resolvePresetRange(state.preset, timeZone);
  }
  return { startDate: state.customStart, endDate: state.customEnd };
}

export function validateRangeState(
  state: ReviewRangeState,
  timeZone: string,
  labels: Dictionary["assistant"],
): string | null {
  const range = resolveRangeFromState(state, timeZone);
  const result = validateReviewRangeParams(
    range.startDate,
    range.endDate,
    timeZone,
  );
  if (result.ok) return null;

  if (result.error === "start_after_end") {
    return labels.rangeErrorStartAfterEnd;
  }
  if (result.error === "range_too_long") {
    return labels.rangeErrorTooLong;
  }
  return labels.rangeErrorInvalid;
}

export function ReviewRangeSelector({
  labels,
  timeZone,
  value,
  onChange,
  validationError,
  onValidationError,
  disabled = false,
}: Props) {
  const presetLabels: Record<ReviewRangePreset, string> = {
    today: labels.rangeToday,
    yesterday: labels.rangeYesterday,
    last7: labels.rangeLast7,
    last30: labels.rangeLast30,
    custom: labels.rangeCustom,
  };

  const resolvedRange = useMemo(
    () => resolveRangeFromState(value, timeZone),
    [value, timeZone],
  );

  function updateState(next: ReviewRangeState) {
    onChange(next);
    onValidationError(validateRangeState(next, timeZone, labels));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{labels.rangeSectionTitle}</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={value.preset === preset ? "default" : "outline"}
            disabled={disabled}
            onClick={() => updateState({ ...value, preset })}
          >
            {presetLabels[preset]}
          </Button>
        ))}
      </div>

      {value.preset === "custom" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <label htmlFor="review-range-start" className="text-sm font-medium">
              {labels.rangeStartLabel}
            </label>
            <Input
              id="review-range-start"
              type="date"
              value={value.customStart}
              disabled={disabled}
              className="w-auto min-w-[10rem]"
              onChange={(event) =>
                updateState({ ...value, customStart: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="review-range-end" className="text-sm font-medium">
              {labels.rangeEndLabel}
            </label>
            <Input
              id="review-range-end"
              type="date"
              value={value.customEnd}
              disabled={disabled}
              className="w-auto min-w-[10rem]"
              onChange={(event) =>
                updateState({ ...value, customEnd: event.target.value })
              }
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {labels.rangePreviewLabel}：{resolvedRange.startDate}{" "}
          {labels.rangeDateSeparator} {resolvedRange.endDate}
          <span className="ml-2 text-xs">
            ({labels.rangeMaxDaysHint.replace("{max}", String(MAX_TIME_REVIEW_RANGE_DAYS))})
          </span>
        </p>
      )}

      {validationError ? (
        <p role="alert" className="text-sm text-destructive">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}

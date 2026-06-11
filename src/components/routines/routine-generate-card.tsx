"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMessage } from "@/lib/i18n";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { estimateRoutineOccurrenceCount } from "@/lib/routines/routine-generate";
import {
  resolvePresetRange,
  validateGenerateDateRange,
} from "@/lib/routines/routine-generate-range";
import type {
  RoutineGenerateRangePreset,
  RoutineGenerateResult,
} from "@/lib/routines/routine-generate-types";
import {
  canSubmitGenerate,
  formatGenerateBlockLine,
  formatGenerateSkippedLine,
  getDefaultSelectedRoutineIds,
  isRoutineGenerateable,
  pruneSelectedRoutineIds,
  resolveGenerateButtonState,
  skipReasonToLabelKey,
} from "@/lib/routines/routine-generate-ui";
import {
  formatDaysOfWeek,
  formatTimeRange,
} from "@/lib/routines/routine-format";
import type { RoutineGenerateListItem } from "@/lib/routines/routine-types";

type Props = {
  locale: Locale;
  timeZone: string;
  routines: RoutineGenerateListItem[];
  labels: Dictionary["routines"]["generate"];
  weekdayLabels: Pick<Dictionary["routines"], "weekdays" | "everyday">;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
};

export function RoutineGenerateCard({
  locale,
  timeZone,
  routines,
  labels,
  weekdayLabels,
}: Props) {
  const activeRoutines = useMemo(
    () => routines.filter((routine) => routine.isActive),
    [routines],
  );
  const generateableRoutines = useMemo(
    () => activeRoutines.filter(isRoutineGenerateable),
    [activeRoutines],
  );

  const [selectedPreset, setSelectedPreset] =
    useState<RoutineGenerateRangePreset>("next7");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(
    () => new Set(getDefaultSelectedRoutineIds(routines)),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] =
    useState<RoutineGenerateResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const effectiveSelectedIds = useMemo(
    () => pruneSelectedRoutineIds(selectedRoutineIds, routines),
    [selectedRoutineIds, routines],
  );

  const resolvedRange = useMemo(() => {
    if (selectedPreset === "custom") {
      if (!customStartDate || !customEndDate) {
        return null;
      }
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return resolvePresetRange(selectedPreset, timeZone);
  }, [selectedPreset, customStartDate, customEndDate, timeZone]);

  const rangeValidationError = useMemo(() => {
    if (!resolvedRange) {
      return selectedPreset === "custom" ? "invalid_date" : null;
    }
    return validateGenerateDateRange(resolvedRange.startDate, resolvedRange.endDate);
  }, [resolvedRange, selectedPreset]);

  const selectedIds = useMemo(
    () => [...effectiveSelectedIds],
    [effectiveSelectedIds],
  );

  const estimatedCount = useMemo(() => {
    if (!resolvedRange || rangeValidationError) {
      return 0;
    }
    return estimateRoutineOccurrenceCount({
      routines,
      selectedRoutineIds: selectedIds,
      startDate: resolvedRange.startDate,
      endDate: resolvedRange.endDate,
      timeZone,
    });
  }, [routines, selectedIds, resolvedRange, rangeValidationError, timeZone]);

  const buttonState = resolveGenerateButtonState({
    isGenerating,
    rangeValidationError,
    selectedCount: selectedIds.length,
    estimatedCount,
  });

  const submitLabel =
    buttonState === "generating"
      ? labels.generating
      : buttonState === "invalid_range"
        ? labels.errorInvalidRange
        : buttonState === "no_selection"
          ? labels.selectRoutinesHint
          : buttonState === "no_matches"
            ? labels.noMatchesHint
            : labels.submit;

  function toggleRoutine(id: string, checked: boolean) {
    setSelectedRoutineIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    setGenerateResult(null);
    setGenerateError(null);
  }

  function selectAllGenerateable() {
    setSelectedRoutineIds(new Set(generateableRoutines.map((routine) => routine.id)));
    setGenerateResult(null);
    setGenerateError(null);
  }

  function deselectAll() {
    setSelectedRoutineIds(new Set());
    setGenerateResult(null);
    setGenerateError(null);
  }

  async function handleGenerate() {
    if (!resolvedRange || !canSubmitGenerate(buttonState)) {
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGenerateResult(null);

    try {
      const response = await fetch("/api/routines/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...resolvedRange,
          routineIds: selectedIds,
        }),
      });

      const body = (await response.json()) as RoutineGenerateResult & ApiErrorBody;

      if (!response.ok) {
        const code = body.error?.toLowerCase() ?? "internal_error";
        const message =
          code === "invalid_date" || code === "invalid_range"
            ? labels.errorInvalidRange
            : code === "range_too_long"
              ? labels.errorRangeTooLong
              : code === "no_active_routines"
                ? labels.errorNoActiveRoutines
                : code === "invalid_input"
                  ? labels.errorInvalidInput
                  : labels.errorGeneric;
        setGenerateError(message);
        return;
      }

      setGenerateResult(body);
    } catch {
      setGenerateError(labels.errorGeneric);
    } finally {
      setIsGenerating(false);
    }
  }

  const presetOptions: {
    id: Exclude<RoutineGenerateRangePreset, "custom">;
    label: string;
  }[] = [
    { id: "next7", label: labels.presetNext7 },
    { id: "thisWeek", label: labels.presetThisWeek },
    { id: "nextWeek", label: labels.presetNextWeek },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 shrink-0" aria-hidden />
          {labels.title}
        </CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {presetOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={selectedPreset === option.id ? "default" : "outline"}
              onClick={() => {
                setSelectedPreset(option.id);
                setGenerateResult(null);
                setGenerateError(null);
              }}
            >
              {option.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={selectedPreset === "custom" ? "default" : "outline"}
            onClick={() => {
              setSelectedPreset("custom");
              setGenerateResult(null);
              setGenerateError(null);
            }}
          >
            {labels.presetCustom}
          </Button>
        </div>

        {selectedPreset === "custom" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{labels.startDate}</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(event) => {
                  setCustomStartDate(event.target.value);
                  setGenerateResult(null);
                  setGenerateError(null);
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{labels.endDate}</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(event) => {
                  setCustomEndDate(event.target.value);
                  setGenerateResult(null);
                  setGenerateError(null);
                }}
              />
            </label>
          </div>
        ) : null}

        {selectedPreset === "custom" && rangeValidationError ? (
          <p className="text-sm text-destructive">
            {rangeValidationError === "range_too_long"
              ? labels.errorRangeTooLong
              : labels.errorInvalidRange}
          </p>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{labels.selectRoutinesHeading}</h3>
            {generateableRoutines.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllGenerateable}>
                  {labels.selectAll}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                  {labels.deselectAll}
                </Button>
              </div>
            ) : null}
          </div>

          {activeRoutines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noActiveHint}</p>
          ) : generateableRoutines.length === 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">{labels.noGenerateable}</p>
              <p className="text-sm text-muted-foreground">{labels.noGenerateableHint}</p>
            </div>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-2 sm:max-h-72">
              {activeRoutines.map((routine) => {
                const generateable = isRoutineGenerateable(routine);
                const daysLabel = formatDaysOfWeek(routine.daysOfWeek, locale, weekdayLabels);
                const timeLabel = formatTimeRange(routine.startTime, routine.endTime);
                const summary = `${routine.categoryName ?? "—"} · ${daysLabel} · ${timeLabel}`;

                return (
                  <li
                    key={routine.id}
                    className={`rounded-md border p-3 ${
                      generateable
                        ? "border-border bg-background"
                        : "border-dashed border-muted-foreground/30 bg-muted/20 opacity-80"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-primary"
                        checked={effectiveSelectedIds.has(routine.id)}
                        disabled={!generateable}
                        onChange={(event) =>
                          toggleRoutine(routine.id, event.target.checked)
                        }
                      />
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block text-sm font-medium">{routine.title}</span>
                        <span className="block text-xs text-muted-foreground">{summary}</span>
                        {!generateable ? (
                          <span className="block text-xs text-amber-700 dark:text-amber-400">
                            {labels.missingCategoryOption}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {resolvedRange && !rangeValidationError ? (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            {estimatedCount > 0 ? (
              <>
                <p className="font-medium">
                  {formatMessage(labels.previewCount, { count: estimatedCount })}
                </p>
                <p className="mt-1 text-muted-foreground">{labels.previewHint}</p>
              </>
            ) : (
              <p className="text-muted-foreground">{labels.previewZero}</p>
            )}
          </div>
        ) : null}

        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={!canSubmitGenerate(buttonState)}
          onClick={handleGenerate}
        >
          {buttonState === "generating" ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              {submitLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>

        {generateError ? (
          <p className="text-sm text-destructive">{generateError}</p>
        ) : null}

        {generateResult ? (
          <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            {generateResult.createdCount > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {formatMessage(labels.createdSummary, {
                    count: generateResult.createdCount,
                  })}
                </p>
                <p className="text-sm text-muted-foreground">{labels.createdHint}</p>
                <p className="text-sm text-muted-foreground">{labels.aiAvoidHint}</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                  {generateResult.createdBlocks.map((block) => (
                    <li key={block.id}>
                      {formatGenerateBlockLine({
                        startTime: block.startTime,
                        endTime: block.endTime,
                        title: block.title,
                        locale,
                        timeZone,
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {generateResult.skippedCount > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {formatMessage(labels.skippedSummary, {
                    count: generateResult.skippedCount,
                  })}
                </p>
                <p className="text-sm text-muted-foreground">{labels.skippedHint}</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                  {generateResult.skippedBlocks.map((block, index) => (
                    <li key={`${block.routineId}-${block.date}-${index}`}>
                      {formatGenerateSkippedLine({
                        date: block.date,
                        startTime: block.startTime,
                        endTime: block.endTime,
                        title: block.title,
                        reasonLabel: labels[skipReasonToLabelKey(block.reason)],
                        locale,
                        timeZone,
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {generateResult.createdCount === 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{labels.noneCreatedTitle}</p>
                <p className="text-sm text-muted-foreground">{labels.noneCreatedHint}</p>
              </div>
            ) : null}

            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href={generateResult.calendarUrl}>
                {labels.viewCalendar}
                <ExternalLink data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

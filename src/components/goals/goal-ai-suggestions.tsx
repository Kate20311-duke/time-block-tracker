"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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
import { readAssistantApiError } from "@/lib/assistant/api-error-client";
import type {
  GoalSuggestionDraft,
  GoalSuggestionsResponse,
} from "@/lib/assistant/goal-suggestions-types";
import type { TimeReviewSource } from "@/lib/assistant/weekly-review-types";
import { formatGoalProgressValue } from "@/lib/goals-metric-display";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type CategoryOption = {
  id: string;
  name: string;
};

type Props = {
  categories: CategoryOption[];
  locale: Locale;
  assistantLabels: Dictionary["assistant"];
  selectedSuggestionId: string | null;
  onSelect: (suggestion: GoalSuggestionDraft) => void;
  onGenerateStart?: () => void;
  labels: {
    title: string;
    description: string;
    disclaimer: string;
    generate: string;
    generating: string;
    errorFailed: string;
    empty: string;
    useSuggestion: string;
    selectedFeedback: string;
    confidenceLow: string;
    confidenceMedium: string;
    confidenceHigh: string;
    allCategories: string;
    metricTimeBlockMinutes: string;
    metricCompletedBlocksCount: string;
    metricFocusMinutes: string;
    metricFocusSessionsCount: string;
    periodDaily: string;
    periodWeekly: string;
    periodOnce: string;
  };
};

function metricLabel(metric: string, labels: Props["labels"]): string {
  switch (metric) {
    case "completed_blocks_count":
      return labels.metricCompletedBlocksCount;
    case "focus_minutes":
      return labels.metricFocusMinutes;
    case "focus_sessions_count":
      return labels.metricFocusSessionsCount;
    default:
      return labels.metricTimeBlockMinutes;
  }
}

function periodLabel(period: string, labels: Props["labels"]): string {
  if (period === "daily") return labels.periodDaily;
  if (period === "weekly") return labels.periodWeekly;
  return labels.periodOnce;
}

function confidenceLabel(
  confidence: GoalSuggestionDraft["confidence"],
  labels: Props["labels"],
): string {
  if (confidence === "high") return labels.confidenceHigh;
  if (confidence === "low") return labels.confidenceLow;
  return labels.confidenceMedium;
}

export function GoalAiSuggestions({
  categories,
  locale,
  assistantLabels,
  selectedSuggestionId,
  onSelect,
  onGenerateStart,
  labels,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GoalSuggestionDraft[]>([]);
  const [dataScopeNote, setDataScopeNote] = useState<string | null>(null);
  const [source, setSource] = useState<TimeReviewSource | null>(null);
  const requestingRef = useRef(false);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const handleGenerate = useCallback(async () => {
    if (requestingRef.current) return;

    requestingRef.current = true;
    onGenerateStart?.();
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setDataScopeNote(null);
    setSource(null);

    try {
      const response = await fetch("/api/assistant/goal-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        setError(
          await readAssistantApiError(
            response,
            assistantLabels,
            labels.errorFailed,
          ),
        );
        return;
      }

      const data = (await response.json()) as GoalSuggestionsResponse;
      setSuggestions(data.suggestions);
      setDataScopeNote(data.dataScopeNote);
      setSource(data.source);
    } catch {
      setError(labels.errorFailed);
    } finally {
      requestingRef.current = false;
      setLoading(false);
    }
  }, [assistantLabels, labels, onGenerateStart]);

  const selectedSuggestion = selectedSuggestionId
    ? suggestions.find((item) => item.id === selectedSuggestionId)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">{labels.disclaimer}</p>

        <Button type="button" onClick={handleGenerate} disabled={loading}>
          {loading ? labels.generating : labels.generate}
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">{labels.generating}</p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {source ? <AssistantSourceNotice source={source} labels={assistantLabels} /> : null}

        {dataScopeNote ? (
          <p className="text-xs text-muted-foreground">{dataScopeNote}</p>
        ) : null}

        {selectedSuggestion ? (
          <p className="text-sm text-muted-foreground">
            {labels.selectedFeedback.replace("{title}", selectedSuggestion.title)}
          </p>
        ) : null}

        {!loading && !error && suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((suggestion) => {
              const isSelected = selectedSuggestionId === suggestion.id;
              const categoryName = suggestion.categoryId
                ? categoryById.get(suggestion.categoryId) ?? null
                : null;

              return (
                <div
                  key={suggestion.id}
                  className={`flex flex-col gap-2 rounded-lg border p-3 ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{suggestion.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.reason}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {metricLabel(suggestion.metric, labels)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {periodLabel(suggestion.period, labels)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {formatGoalProgressValue(
                        suggestion.metric,
                        suggestion.targetValue,
                        locale,
                      )}
                    </Badge>
                    {categoryName ? (
                      <Badge variant="outline" className="text-[10px]">
                        {categoryName}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {labels.allCategories}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {confidenceLabel(suggestion.confidence, labels)}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => onSelect(suggestion)}
                  >
                    {labels.useSuggestion}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

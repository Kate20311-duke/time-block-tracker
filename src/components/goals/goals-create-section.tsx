"use client";

import { useMemo, useState } from "react";

import { GoalAiSuggestions } from "@/components/goals/goal-ai-suggestions";
import {
  GoalFormCard,
  type GoalFormDefaults,
} from "@/components/goals/goal-form-card";
import {
  GoalTemplatesPicker,
  type ResolvedGoalTemplate,
} from "@/components/goals/goal-templates-picker";
import type { GoalSuggestionDraft } from "@/lib/assistant/goal-suggestions-types";
import type { GoalMetric } from "@/lib/constants";
import {
  getGoalTemplateById,
  type GoalTemplateId,
  templateToFormDefaults,
} from "@/lib/goal-templates";
import { suggestionToFormDefaults } from "@/lib/goal-prefill";
import type { Locale } from "@/lib/i18n/types";

type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

type FormLabels = React.ComponentProps<typeof GoalFormCard>["labels"];

type TemplateLabels = React.ComponentProps<typeof GoalTemplatesPicker>["labels"];

type AiSuggestionLabels = Omit<
  React.ComponentProps<typeof GoalAiSuggestions>["labels"],
  never
>;

type Props = {
  categories: CategoryOption[];
  defaultStartDate: string;
  locale: Locale;
  assistantLabels: React.ComponentProps<typeof GoalAiSuggestions>["assistantLabels"];
  templates: ResolvedGoalTemplate[];
  action: (formData: FormData) => Promise<void>;
  formLabels: FormLabels;
  templateLabels: TemplateLabels;
  aiSuggestionLabels: AiSuggestionLabels;
};

export function GoalsCreateSection({
  categories,
  defaultStartDate,
  locale,
  templates,
  action,
  formLabels,
  templateLabels,
  aiSuggestionLabels,
  assistantLabels,
}: Props) {
  const [goalType, setGoalType] = useState<"one_time" | "recurring">("recurring");
  const [period, setPeriod] = useState<"once" | "daily" | "weekly">("weekly");
  const [metric, setMetric] = useState<GoalMetric>("time_block_minutes");
  const [formDefaults, setFormDefaults] = useState<GoalFormDefaults | undefined>();
  const [selectedTemplateId, setSelectedTemplateId] = useState<GoalTemplateId | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [formRevision, setFormRevision] = useState(0);

  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );

  function applyPrefill(defaults: GoalFormDefaults, nextMetric: GoalMetric) {
    setMetric(nextMetric);
    if (defaults.goalType) setGoalType(defaults.goalType);
    if (defaults.period) setPeriod(defaults.period);
    setFormDefaults(defaults);
    setFormRevision((revision) => revision + 1);
  }

  function handleGoalTypeChange(value: "one_time" | "recurring") {
    setGoalType(value);
    if (value === "one_time") setPeriod("once");
    else if (period === "once") setPeriod("daily");
  }

  function handlePeriodChange(value: "once" | "daily" | "weekly") {
    setPeriod(value);
    if (value === "once") setGoalType("one_time");
  }

  function handleTemplateSelect(templateId: GoalTemplateId) {
    const definition = getGoalTemplateById(templateId);
    const resolved = templateById.get(templateId);
    if (!definition || !resolved) return;

    setSelectedSuggestionId(null);
    setSelectedTemplateId(templateId);
    applyPrefill(
      templateToFormDefaults(definition, defaultStartDate, {
        title: resolved.title,
        description: resolved.description,
      }),
      definition.metric,
    );
  }

  function handleSuggestionSelect(suggestion: GoalSuggestionDraft) {
    setSelectedTemplateId(null);
    setSelectedSuggestionId(suggestion.id);
    applyPrefill(
      suggestionToFormDefaults(suggestion, defaultStartDate),
      suggestion.metric,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <GoalTemplatesPicker
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelect={handleTemplateSelect}
        labels={templateLabels}
      />
      <GoalAiSuggestions
        categories={categories}
        locale={locale}
        assistantLabels={assistantLabels}
        selectedSuggestionId={selectedSuggestionId}
        onSelect={handleSuggestionSelect}
        onGenerateStart={() => setSelectedSuggestionId(null)}
        labels={aiSuggestionLabels}
      />
      <GoalFormCard
        categories={categories}
        defaultStartDate={defaultStartDate}
        action={action}
        labels={formLabels}
        metric={metric}
        onMetricChange={setMetric}
        goalType={goalType}
        onGoalTypeChange={handleGoalTypeChange}
        period={period}
        onPeriodChange={handlePeriodChange}
        formDefaults={formDefaults}
        formRevision={formRevision}
      />
    </div>
  );
}

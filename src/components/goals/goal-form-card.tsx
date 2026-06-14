"use client";

import { GoalFormFields, type GoalFormDefaults } from "@/components/goals/goal-form-fields";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GoalMetric } from "@/lib/constants";

type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  categories: CategoryOption[];
  defaultStartDate: string;
  action: (formData: FormData) => Promise<void>;
  labels: {
    heading: string;
    description: string;
    submit: string;
    submitting: string;
    title: string;
    titlePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    category: string;
    categoryHint: string;
    allCategories: string;
    noCategoriesHint: string;
    goCreateCategory: string;
    targetHours: string;
    targetHoursHint: string;
    targetCount: string;
    targetCountHint: string;
    goalType: string;
    goalTypeOneTime: string;
    goalTypeRecurring: string;
    period: string;
    periodOnce: string;
    periodDaily: string;
    periodWeekly: string;
    startDate: string;
    endDate: string;
    endDateRequired: string;
    endDateOptional: string;
    activeLabel: string;
    readOnlyTypeHint: string;
    metric: string;
    metricHint: string;
    metricSeparateWarning: string;
    readOnlyMetricHint: string;
    metricTimeBlockMinutes: string;
    metricCompletedBlocksCount: string;
    metricFocusMinutes: string;
    metricFocusMinutesHint: string;
    metricFocusSessionsCount: string;
  };
  metric: GoalMetric;
  onMetricChange: (value: GoalMetric) => void;
  goalType: "one_time" | "recurring";
  onGoalTypeChange: (value: "one_time" | "recurring") => void;
  period: "once" | "daily" | "weekly";
  onPeriodChange: (value: "once" | "daily" | "weekly") => void;
  formDefaults?: GoalFormDefaults;
  formRevision?: number;
};

export function GoalFormCard({
  categories,
  defaultStartDate,
  action,
  labels,
  metric,
  onMetricChange,
  goalType,
  onGoalTypeChange,
  period,
  onPeriodChange,
  formDefaults,
  formRevision = 0,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.heading}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="goalType" value={goalType} />
          <input type="hidden" name="period" value={period} />
          <GoalFormFields
            key={formRevision}
            mode="create"
            categories={categories}
            metric={metric}
            onMetricChange={onMetricChange}
            goalType={goalType}
            period={period}
            onGoalTypeChange={onGoalTypeChange}
            onPeriodChange={onPeriodChange}
            defaultStartDate={defaultStartDate}
            defaults={formDefaults}
            labels={labels}
          />
          <div>
            <SubmitButton label={labels.submit} pendingLabel={labels.submitting} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export type { GoalFormDefaults };

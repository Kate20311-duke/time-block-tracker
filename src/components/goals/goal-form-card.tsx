"use client";

import { useState } from "react";

import { GoalFormFields, type GoalFormDefaults } from "@/components/goals/goal-form-fields";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  };
};

export function GoalFormCard({ categories, defaultStartDate, action, labels }: Props) {
  const [goalType, setGoalType] = useState<"one_time" | "recurring">("recurring");
  const [period, setPeriod] = useState<"once" | "daily" | "weekly">("weekly");

  function handleGoalTypeChange(value: "one_time" | "recurring") {
    setGoalType(value);
    if (value === "one_time") setPeriod("once");
    else if (period === "once") setPeriod("daily");
  }

  function handlePeriodChange(value: "once" | "daily" | "weekly") {
    setPeriod(value);
    if (value === "once") setGoalType("one_time");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.heading}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="metric" value="time_block_minutes" />
          <input type="hidden" name="goalType" value={goalType} />
          <input type="hidden" name="period" value={period} />
          <GoalFormFields
            mode="create"
            categories={categories}
            goalType={goalType}
            period={period}
            onGoalTypeChange={handleGoalTypeChange}
            onPeriodChange={handlePeriodChange}
            defaultStartDate={defaultStartDate}
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

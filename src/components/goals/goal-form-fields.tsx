"use client";

import Link from "next/link";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

export type GoalFormDefaults = {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  targetHours?: string;
  startDate?: string;
  endDate?: string | null;
  goalType?: "one_time" | "recurring";
  period?: "once" | "daily" | "weekly";
  isActive?: boolean;
};

type Props = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  defaults?: GoalFormDefaults;
  goalType: "one_time" | "recurring";
  period: "once" | "daily" | "weekly";
  onGoalTypeChange: (value: "one_time" | "recurring") => void;
  onPeriodChange: (value: "once" | "daily" | "weekly") => void;
  defaultStartDate: string;
  filter?: string;
  labels: {
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

export function GoalFormFields({
  mode,
  categories,
  defaults,
  goalType,
  period,
  onGoalTypeChange,
  onPeriodChange,
  defaultStartDate,
  filter,
  labels,
}: Props) {
  const showEndDateField =
    goalType === "one_time" || (mode === "edit" && goalType === "recurring");

  return (
    <>
      {mode === "edit" && filter ? (
        <input type="hidden" name="filter" value={filter} />
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.title}</span>
        <Input
          name="title"
          required
          maxLength={120}
          placeholder={labels.titlePlaceholder}
          defaultValue={defaults?.title ?? ""}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.descriptionLabel}</span>
        <Textarea
          name="description"
          rows={2}
          placeholder={labels.descriptionPlaceholder}
          defaultValue={defaults?.description ?? ""}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.category}</span>
        <span className="text-xs text-muted-foreground">{labels.categoryHint}</span>
        {categories.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            {labels.noCategoriesHint}{" "}
            <Link href="/categories" className="text-primary underline-offset-4 hover:underline">
              {labels.goCreateCategory}
            </Link>
          </span>
        ) : (
          <select
            name="categoryId"
            defaultValue={defaults?.categoryId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">{labels.allCategories}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{labels.targetHours}</span>
          <Input
            name="targetHours"
            type="number"
            min="0.1"
            step="0.5"
            required
            defaultValue={defaults?.targetHours ?? "2"}
          />
          <span className="text-xs text-muted-foreground">{labels.targetHoursHint}</span>
        </label>
        {mode === "create" ? (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{labels.startDate}</span>
            <Input
              name="startDate"
              type="date"
              required
              defaultValue={defaults?.startDate ?? defaultStartDate}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{labels.startDate}</span>
            <p className="text-sm text-muted-foreground">
              {defaults?.startDate ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">{labels.readOnlyTypeHint}</p>
          </div>
        )}
      </div>

      {mode === "create" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{labels.goalType}</span>
            <Select value={goalType} onValueChange={(v) => onGoalTypeChange(v as "one_time" | "recurring")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">{labels.goalTypeOneTime}</SelectItem>
                <SelectItem value="recurring">{labels.goalTypeRecurring}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{labels.period}</span>
            <Select
              value={period}
              onValueChange={(v) => onPeriodChange(v as "once" | "daily" | "weekly")}
              disabled={goalType === "one_time"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">{labels.periodOnce}</SelectItem>
                <SelectItem value="daily">{labels.periodDaily}</SelectItem>
                <SelectItem value="weekly">{labels.periodWeekly}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>
            {labels.goalType}:{" "}
            {goalType === "one_time" ? labels.goalTypeOneTime : labels.goalTypeRecurring}
          </span>
          <span>·</span>
          <span>
            {labels.period}:{" "}
            {period === "once"
              ? labels.periodOnce
              : period === "daily"
                ? labels.periodDaily
                : labels.periodWeekly}
          </span>
        </div>
      )}

      {showEndDateField ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{labels.endDate}</span>
          <Input
            name="endDate"
            type="date"
            required={goalType === "one_time"}
            defaultValue={defaults?.endDate ?? ""}
          />
          <span className="text-xs text-muted-foreground">
            {goalType === "one_time"
              ? labels.endDateRequired
              : labels.endDateOptional}
          </span>
        </label>
      ) : null}

      {mode === "edit" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaults?.isActive ?? true}
            className="size-4 rounded border border-input"
          />
          <span>{labels.activeLabel}</span>
        </label>
      ) : null}
    </>
  );
}

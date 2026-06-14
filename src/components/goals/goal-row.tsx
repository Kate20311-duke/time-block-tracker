"use client";

import Link from "next/link";
import { useState } from "react";

import { GoalFormFields, type GoalFormDefaults } from "@/components/goals/goal-form-fields";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatMessage } from "@/lib/i18n";
import type { GoalListFilter } from "@/lib/goals";
import type { GoalProgressSummary } from "@/lib/goals";
import { formatDurationMinutes } from "@/lib/time";
import type { Locale } from "@/lib/i18n/types";

type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

type CategoryInfo = {
  name: string;
  color: string;
} | null;

type HistoryPeriod = {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  actualMinutes: number;
  targetMinutes: number;
  status: string;
};

type FormLabels = {
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

type Props = {
  locale: Locale;
  title: string;
  description?: string | null;
  categoryId: string | null;
  category: CategoryInfo;
  summary: GoalProgressSummary;
  historyPeriods: HistoryPeriod[];
  periodLabel: string;
  timeZone: string;
  goalId: string;
  isActive: boolean;
  goalType: "one_time" | "recurring";
  period: "once" | "daily" | "weekly";
  formDefaults: GoalFormDefaults;
  categories: CategoryOption[];
  filter: GoalListFilter;
  detailHref: string;
  updateAction: (formData: FormData) => Promise<void>;
  deactivateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  formLabels: FormLabels;
  labels: {
    progress: string;
    progressOf: string;
    currentPeriod: string;
    streak: string;
    streakCurrent: string;
    streakLongest: string;
    achievementRate: string;
    achievementRateValue: string;
    history: string;
    deactivate: string;
    inactive: string;
    edit: string;
    save: string;
    cancel: string;
    editHeading: string;
    viewDetails: string;
    confirmDelete: string;
    confirmDeleteTitle: string;
    delete: string;
    submitting: string;
    allCategories: string;
    categoryRemoved: string;
    periodDaily: string;
    periodWeekly: string;
    periodOnce: string;
    status: {
      active: string;
      achieved: string;
      missed: string;
    };
  };
};

function periodKindLabel(period: string, labels: Props["labels"]): string {
  if (period === "daily") return labels.periodDaily;
  if (period === "weekly") return labels.periodWeekly;
  return labels.periodOnce;
}

function statusLabel(status: string, labels: Props["labels"]): string {
  if (status === "achieved") return labels.status.achieved;
  if (status === "missed") return labels.status.missed;
  return labels.status.active;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "achieved") return "default";
  if (status === "missed") return "destructive";
  return "secondary";
}

export function GoalRow({
  locale,
  title,
  description,
  categoryId,
  category,
  summary,
  historyPeriods,
  periodLabel,
  timeZone,
  goalId,
  isActive,
  goalType,
  period,
  formDefaults,
  categories,
  filter,
  detailHref,
  updateAction,
  deactivateAction,
  deleteAction,
  formLabels,
  labels,
}: Props) {
  const [editing, setEditing] = useState(false);

  const dateFormatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  });

  const actual = summary.currentPeriod?.actualMinutes ?? 0;
  const target = summary.currentPeriod?.targetMinutes ?? summary.targetMinutes;
  const actualLabel = formatDurationMinutes(actual, locale);
  const targetLabel = formatDurationMinutes(target, locale);
  const evaluatedHistory = historyPeriods.filter((p) => p.status !== "active");

  if (editing) {
    return (
      <Card className={isActive ? undefined : "opacity-80"}>
        <CardHeader>
          <CardTitle className="text-base">{labels.editHeading}</CardTitle>
          <CardDescription>{title}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={goalId} />
            <GoalFormFields
              mode="edit"
              categories={categories}
              defaults={formDefaults}
              goalType={goalType}
              period={period}
              onGoalTypeChange={() => {}}
              onPeriodChange={() => {}}
              defaultStartDate={formDefaults.startDate ?? ""}
              filter={filter}
              labels={formLabels}
            />
            <div className="flex flex-wrap gap-2">
              <SubmitButton label={labels.save} pendingLabel={labels.submitting} />
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                {labels.cancel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isActive ? undefined : "opacity-80"}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isActive ? <Badge variant="outline">{labels.inactive}</Badge> : null}
            <Badge variant="secondary">{periodKindLabel(summary.period, labels)}</Badge>
            {category ? (
              <Badge
                variant="outline"
                style={{ borderColor: category.color, color: category.color }}
              >
                {category.name}
              </Badge>
            ) : categoryId ? (
              <Badge variant="outline">{labels.categoryRemoved}</Badge>
            ) : (
              <Badge variant="outline">{labels.allCategories}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{labels.progress}</span>
            <span className="text-muted-foreground">
              {formatMessage(labels.progressOf, {
                actual: actualLabel,
                target: targetLabel,
              })}
            </span>
          </div>
          <Progress value={summary.progressPercent} />
          <p className="text-xs text-muted-foreground">
            {labels.currentPeriod}: {periodLabel}
          </p>
        </div>

        {summary.period !== "once" ? (
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>
              {formatMessage(labels.streakCurrent, {
                count: String(summary.currentStreak),
              })}
            </span>
            <span>
              {formatMessage(labels.streakLongest, {
                count: String(summary.longestStreak),
              })}
            </span>
            <span>
              {formatMessage(labels.achievementRateValue, {
                rate: String(Math.round(summary.achievementRate * 100)),
                achieved: String(summary.achievedCount),
                total: String(summary.evaluatedCount),
              })}
            </span>
          </div>
        ) : null}

        {evaluatedHistory.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{labels.history}</p>
            <ul className="flex flex-col gap-1.5">
              {evaluatedHistory.slice(0, 5).map((historyPeriod) => (
                <li
                  key={historyPeriod.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {dateFormatter.format(historyPeriod.periodStart)}
                    {summary.period === "weekly"
                      ? ` – ${dateFormatter.format(new Date(historyPeriod.periodEnd.getTime() - 1))}`
                      : null}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      {formatDurationMinutes(historyPeriod.actualMinutes, locale)} /{" "}
                      {formatDurationMinutes(historyPeriod.targetMinutes, locale)}
                    </span>
                    <Badge variant={statusVariant(historyPeriod.status)}>
                      {statusLabel(historyPeriod.status, labels)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={detailHref}>{labels.viewDetails}</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            {labels.edit}
          </Button>
          {isActive ? (
            <form action={deactivateAction}>
              <input type="hidden" name="id" value={goalId} />
              <SubmitButton
                label={labels.deactivate}
                pendingLabel={labels.submitting}
                variant="secondary"
                className="h-8 px-3 text-sm"
              />
            </form>
          ) : null}
          <DeleteConfirmButton
            action={deleteAction}
            id={goalId}
            confirmMessage={labels.confirmDelete}
            confirmTitle={labels.confirmDeleteTitle}
            cancelLabel={labels.cancel}
            deleteLabel={labels.delete}
          />
        </div>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";

import { GoalHistoryBars } from "@/components/goals/goal-history-bars";
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
import type { GoalDetailData } from "@/lib/actions/goals";
import { formatAchievementRatePercent, formatGoalHistoryProgressLabel, formatPeriodRangeLabel } from "@/lib/goals-detail";
import {
  formatGoalProgressPair,
  formatGoalRemaining,
} from "@/lib/goals-metric-display";
import { formatMessage } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

type Labels = {
  backToGoals: string;
  currentProgress: string;
  progress: string;
  progressOf: string;
  progressCount: string;
  remaining: string;
  remainingCount: string;
  streakSummary: string;
  streakCurrent: string;
  streakLongest: string;
  achievedPeriods: string;
  evaluatedPeriods: string;
  achievementRate: string;
  achievementRateValue: string;
  historyTitle: string;
  historyEmpty: string;
  trendTitle: string;
  refreshProgress: string;
  goalType: string;
  goalTypeOneTime: string;
  goalTypeRecurring: string;
  periodKind: string;
  periodOnce: string;
  periodDaily: string;
  periodWeekly: string;
  overallStatus: string;
  statusActive: string;
  statusAchieved: string;
  statusMissed: string;
  statusInactive: string;
  allCategories: string;
  categoryRemoved: string;
  evaluatedAt: string;
  submitting: string;
  periodStatus: {
    active: string;
    achieved: string;
    missed: string;
  };
};

type Props = {
  data: GoalDetailData;
  locale: Locale;
  timeZone: string;
  fromFilter: string;
  refreshAction: (formData: FormData) => Promise<void>;
  labels: Labels;
};

function overallStatusLabel(status: string, labels: Labels): string {
  if (status === "achieved") return labels.statusAchieved;
  if (status === "missed") return labels.statusMissed;
  if (status === "inactive") return labels.statusInactive;
  return labels.statusActive;
}

function overallStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "achieved") return "default";
  if (status === "missed") return "destructive";
  if (status === "inactive") return "outline";
  return "secondary";
}

function periodStatusLabel(status: string, labels: Labels): string {
  if (status === "achieved") return labels.periodStatus.achieved;
  if (status === "missed") return labels.periodStatus.missed;
  return labels.periodStatus.active;
}

function periodStatusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "achieved") return "default";
  if (status === "missed") return "destructive";
  return "secondary";
}

export function GoalDetailView({
  data,
  locale,
  timeZone,
  fromFilter,
  refreshAction,
  labels,
}: Props) {
  const { goal, summary, overallStatus, progress, historyPeriods, historyBars, backHref } =
    data;

  const dateFormatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  const progressLabel = formatGoalProgressPair(
    progress.metric,
    progress.actualMinutes,
    progress.targetMinutes,
    locale,
    {
      progressOf: labels.progressOf,
      progressCount: labels.progressCount,
      remaining: labels.remaining,
      remainingCount: labels.remainingCount,
    },
  );
  const isRecurring = goal.period !== "once";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href={backHref}>{labels.backToGoals}</Link>
        </Button>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{goal.title}</h1>
          {goal.description ? (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {goal.category ? (
              <Badge
                variant="outline"
                style={{ borderColor: goal.category.color, color: goal.category.color }}
              >
                {goal.category.name}
              </Badge>
            ) : goal.categoryId ? (
              <Badge variant="outline">{labels.categoryRemoved}</Badge>
            ) : (
              <Badge variant="outline">{labels.allCategories}</Badge>
            )}
            <Badge variant="secondary">
              {goal.goalType === "one_time"
                ? labels.goalTypeOneTime
                : labels.goalTypeRecurring}
            </Badge>
            <Badge variant="secondary">
              {goal.period === "daily"
                ? labels.periodDaily
                : goal.period === "weekly"
                  ? labels.periodWeekly
                  : labels.periodOnce}
            </Badge>
            <Badge variant={overallStatusVariant(overallStatus)}>
              {overallStatusLabel(overallStatus, labels)}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.currentProgress}</CardTitle>
          <CardDescription>{progress.periodLabel}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{labels.progress}</span>
            <span className="text-muted-foreground">{progressLabel}</span>
          </div>
          <Progress value={progress.progressPercent} />
          {progress.remainingMinutes !== null ? (
            <p className="text-sm text-muted-foreground">
              {formatGoalRemaining(progress.metric, progress.remainingMinutes, locale, {
                remaining: labels.remaining,
                remainingCount: labels.remainingCount,
              })}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {isRecurring ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.streakSummary}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              {formatMessage(labels.streakCurrent, {
                count: String(summary.currentStreak),
              })}
            </p>
            <p>
              {formatMessage(labels.streakLongest, {
                count: String(summary.longestStreak),
              })}
            </p>
            <p>
              {formatMessage(labels.achievedPeriods, {
                count: String(summary.achievedCount),
              })}
            </p>
            <p>
              {formatMessage(labels.evaluatedPeriods, {
                count: String(summary.evaluatedCount),
              })}
            </p>
            <p className="sm:col-span-2">
              {formatMessage(labels.achievementRateValue, {
                rate: String(formatAchievementRatePercent(summary.achievementRate)),
                achieved: String(summary.achievedCount),
                total: String(summary.evaluatedCount),
              })}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {goal.period !== "once" && historyBars.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels.trendTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalHistoryBars bars={historyBars} ariaLabel={labels.trendTitle} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{labels.historyTitle}</CardTitle>
          <form action={refreshAction}>
            <input type="hidden" name="goalId" value={goal.id} />
            <input type="hidden" name="fromFilter" value={fromFilter} />
            <SubmitButton
              label={labels.refreshProgress}
              pendingLabel={labels.submitting}
              variant="secondary"
              className="h-8 px-3 text-sm"
            />
          </form>
        </CardHeader>
        <CardContent>
          {historyPeriods.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.historyEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {historyPeriods.map((period) => (
                <li
                  key={period.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-muted-foreground">
                      {formatPeriodRangeLabel(
                        period.periodStart,
                        period.periodEnd,
                        goal.period,
                        locale,
                        timeZone,
                      )}
                    </span>
                    {period.evaluatedAt ? (
                      <span className="text-xs text-muted-foreground">
                        {formatMessage(labels.evaluatedAt, {
                          date: dateFormatter.format(period.evaluatedAt),
                        })}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      {formatGoalHistoryProgressLabel(
                        goal.metric,
                        period.actualMinutes,
                        period.targetMinutes,
                        locale,
                      )}
                    </span>
                    <Badge variant={periodStatusVariant(period.status)}>
                      {periodStatusLabel(period.status, labels)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

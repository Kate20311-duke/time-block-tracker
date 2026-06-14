import Link from "next/link";
import { Target } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatMessage } from "@/lib/i18n";
import type { GoalProgressSummary } from "@/lib/goals";
import { formatGoalProgressPair } from "@/lib/goals-metric-display";
import type { Locale } from "@/lib/i18n/types";

export type DashboardGoalPreviewItem = {
  goalId: string;
  title: string;
  summary: GoalProgressSummary;
};

type Props = {
  locale: Locale;
  items: DashboardGoalPreviewItem[];
  labels: {
    title: string;
    description: string;
    empty: string;
    emptyHint: string;
    viewAll: string;
    progressOf: string;
    progressCount: string;
    streak: string;
  };
};

export function DashboardGoalsPreview({ locale, items, labels }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-4 text-muted-foreground" />
            {labels.title}
          </CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </div>
        <Link
          href="/goals"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {labels.viewAll}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          items.map((item) => {
            const actual = item.summary.currentPeriod?.actualMinutes ?? 0;
            const target =
              item.summary.currentPeriod?.targetMinutes ?? item.summary.targetMinutes;
            return (
              <div key={item.goalId} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  {item.summary.period !== "once" && item.summary.currentStreak > 0 ? (
                    <Badge variant="secondary" className="shrink-0">
                      {formatMessage(labels.streak, {
                        count: String(item.summary.currentStreak),
                      })}
                    </Badge>
                  ) : null}
                </div>
                <Progress value={item.summary.progressPercent} />
                <p className="text-xs text-muted-foreground">
                  {formatGoalProgressPair(
                    item.summary.metric,
                    actual,
                    target,
                    locale,
                    {
                      progressOf: labels.progressOf,
                      progressCount: labels.progressCount,
                      remaining: "",
                      remainingCount: "",
                    },
                  )}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

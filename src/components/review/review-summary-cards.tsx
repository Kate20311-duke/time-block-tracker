import {
  Calendar,
  CheckCircle2,
  Clock,
  SkipForward,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/types";

export type ReviewSummaryCard = {
  label: string;
  value: string;
  hint?: string;
};

const icons = [Clock, CheckCircle2, Calendar, SkipForward] as const;

type Props = {
  cards: ReviewSummaryCard[];
};

export function ReviewSummaryCards({ cards }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = icons[index] ?? Clock;
        return (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardDescription>{card.label}</CardDescription>
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {card.value}
              </p>
              {card.hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function buildReviewSummaryCards(
  summary: {
    totalPlannedMinutes: number;
    totalCompletedMinutes: number;
    totalSkippedMinutes: number;
    completionRate: number;
  },
  completedBlockCount: number,
  totalBlockCount: number,
  formatDuration: (minutes: number) => string,
  labels: Pick<
    Dictionary["review"],
    | "totalPlannedTime"
    | "estimatedCompletedTime"
    | "completionRate"
    | "completedBlocksCount"
    | "skippedTime"
  >,
): ReviewSummaryCard[] {
  return [
    {
      label: labels.totalPlannedTime,
      value: formatDuration(summary.totalPlannedMinutes),
    },
    {
      label: labels.estimatedCompletedTime,
      value: formatDuration(summary.totalCompletedMinutes),
    },
    {
      label: labels.completionRate,
      value: `${Math.round(summary.completionRate * 100)}%`,
      hint: labels.completedBlocksCount + `: ${completedBlockCount}/${totalBlockCount}`,
    },
    {
      label: labels.skippedTime,
      value: formatDuration(summary.totalSkippedMinutes),
    },
  ];
}

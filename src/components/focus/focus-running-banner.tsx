"use client";

import { ElapsedTimer } from "@/components/elapsed-timer";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  mode: "stopwatch" | "pomodoro";
  title: string | null;
  categoryName: string;
  categoryColor: string;
  startTimeIso?: string;
  plannedDurationMinutes?: number;
  labels: Pick<
    Dictionary["focus"],
    | "runningBannerStopwatch"
    | "runningBannerPomodoro"
    | "stopwatchTimerAria"
    | "defaultTimeBlockTitle"
    | "minutesUnit"
  >;
};

export function FocusRunningBanner({
  mode,
  title,
  categoryName,
  categoryColor,
  startTimeIso,
  plannedDurationMinutes,
  labels,
}: Props) {
  const displayTitle = title?.trim() || labels.defaultTimeBlockTitle;
  const bannerTitle =
    mode === "stopwatch"
      ? labels.runningBannerStopwatch
      : labels.runningBannerPomodoro;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            {bannerTitle}
          </CardTitle>
          <Badge variant="outline" className="gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            {categoryName}
          </Badge>
        </div>
        <CardDescription>{displayTitle}</CardDescription>
      </CardHeader>
      {mode === "stopwatch" && startTimeIso ? (
        <CardContent className="pt-0">
          <ElapsedTimer
            startTimeIso={startTimeIso}
            ariaLabel={labels.stopwatchTimerAria}
            className="font-mono text-3xl font-semibold tabular-nums tracking-tight"
          />
        </CardContent>
      ) : plannedDurationMinutes ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {plannedDurationMinutes} {labels.minutesUnit}
        </CardContent>
      ) : null}
    </Card>
  );
}

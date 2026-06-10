"use client";

import Link from "next/link";
import { Pause, Square } from "lucide-react";

import { ElapsedTimer } from "@/components/elapsed-timer";
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
import { computeFocusSessionElapsedSeconds } from "@/lib/focus-session-elapsed";
import type { Dictionary } from "@/lib/i18n/types";

export type DashboardRunningSession = {
  id: string;
  mode: "pomodoro" | "stopwatch";
  status: string;
  title: string | null;
  startTimeIso: string;
  pausedAtIso: string | null;
  pausedTotalSeconds: number;
  plannedDurationMinutes: number;
  category: {
    name: string;
    color: string;
  };
};

type Props = {
  session: DashboardRunningSession | null;
  startedAtLabel: string;
  labels: Pick<
    Dictionary["dashboard"],
    | "activeTimer"
    | "activeTimerEmpty"
    | "goToFocus"
    | "manageOnFocusPage"
    | "activeTimerPaused"
  > &
    Pick<Dictionary["focus"], "stopwatchTimerAria" | "defaultTimeBlockTitle">;
};

function elapsedMinutes(session: DashboardRunningSession): number {
  const seconds = computeFocusSessionElapsedSeconds({
    startTime: new Date(session.startTimeIso),
    status: session.status,
    pausedAt: session.pausedAtIso ? new Date(session.pausedAtIso) : null,
    pausedTotalSeconds: session.pausedTotalSeconds,
  });
  return Math.max(0, Math.floor(seconds / 60));
}

export function DashboardActiveTimer({ session, startedAtLabel, labels }: Props) {
  if (!session) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{labels.activeTimer}</CardTitle>
          <CardDescription>{labels.activeTimerEmpty}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/focus?mode=stopwatch">{labels.goToFocus}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPaused = session.status === "paused";
  const title = session.title?.trim() || labels.defaultTimeBlockTitle;
  const usedMinutes = elapsedMinutes(session);
  const goalMinutes =
    session.mode === "pomodoro" ? session.plannedDurationMinutes : null;
  const progressValue =
    goalMinutes && goalMinutes > 0
      ? Math.min(100, (usedMinutes / goalMinutes) * 100)
      : undefined;

  return (
    <Card className="overflow-hidden lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {isPaused ? (
              <Pause className="size-4 text-muted-foreground" />
            ) : (
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
            )}
            {labels.activeTimer}
            {isPaused ? (
              <span className="text-sm font-normal text-muted-foreground">
                · {labels.activeTimerPaused}
              </span>
            ) : null}
          </CardTitle>
          <Badge variant="outline" className="gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: session.category.color }}
            />
            {session.category.name}
          </Badge>
        </div>
        <CardDescription>{startedAtLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <ElapsedTimer
              startTimeIso={session.startTimeIso}
              pausedAtIso={session.pausedAtIso}
              pausedTotalSeconds={session.pausedTotalSeconds}
              isPaused={isPaused}
              ariaLabel={labels.stopwatchTimerAria}
              className="font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl"
            />
            <span className="text-sm text-muted-foreground">{title}</span>
          </div>
          <Button size="sm" asChild>
            <Link
              href={
                session.mode === "stopwatch"
                  ? "/focus?mode=stopwatch"
                  : "/focus?mode=pomodoro"
              }
            >
              <Square data-icon="inline-start" />
              {labels.manageOnFocusPage}
            </Link>
          </Button>
        </div>
        {goalMinutes ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{goalMinutes} min</span>
              <span>{usedMinutes} min</span>
            </div>
            <Progress value={progressValue} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

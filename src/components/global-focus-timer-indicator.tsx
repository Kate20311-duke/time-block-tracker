"use client";

import Link from "next/link";
import { Pause } from "lucide-react";

import { ElapsedTimer } from "@/components/elapsed-timer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/types";
import { focusCategorySwatchProps } from "@/lib/focus-category-display";

export type GlobalActiveFocusSession = {
  id: string;
  mode: "stopwatch" | "pomodoro";
  status: string;
  startTimeIso: string;
  pausedAtIso: string | null;
  pausedTotalSeconds: number;
  title: string | null;
  plannedDurationMinutes: number;
  category: {
    name: string;
    color: string;
    removed: boolean;
  };
};

type Props = {
  session: GlobalActiveFocusSession | null;
  labels: Pick<
    Dictionary["shell"],
    "activeTimerIndicator" | "activeTimerPaused"
  > &
    Pick<Dictionary["focus"], "stopwatchTimerAria">;
};

export function GlobalFocusTimerIndicator({ session, labels }: Props) {
  if (!session) {
    return null;
  }

  const isPaused = session.status === "paused";
  const href =
    session.mode === "stopwatch"
      ? "/focus?mode=stopwatch"
      : "/focus?mode=pomodoro";
  const swatch = focusCategorySwatchProps(
    session.category.removed,
    session.category.color,
  );

  return (
    <Button variant="outline" size="sm" asChild className="hidden shrink-0 gap-2 sm:inline-flex">
      <Link href={href}>
        {isPaused ? (
          <Pause data-icon="inline-start" className="size-3.5" />
        ) : (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
        )}
        <ElapsedTimer
          startTimeIso={session.startTimeIso}
          pausedAtIso={session.pausedAtIso}
          pausedTotalSeconds={session.pausedTotalSeconds}
          isPaused={isPaused}
          ariaLabel={labels.stopwatchTimerAria}
          className="font-mono text-sm tabular-nums"
        />
        <Badge variant="secondary" className="hidden gap-1 md:inline-flex">
          <span
            className={`size-2 rounded-full ${swatch.className}`}
            style={swatch.style}
          />
          {session.category.name}
          {isPaused ? ` · ${labels.activeTimerPaused}` : null}
        </Badge>
        <span className="sr-only">{labels.activeTimerIndicator}</span>
      </Link>
    </Button>
  );
}

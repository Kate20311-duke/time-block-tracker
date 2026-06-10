import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/types";

type ReviewMode = "day" | "week";

type Props = {
  mode: ReviewMode;
  dateParam: string;
  labels: Pick<Dictionary["review"], "tabDay" | "tabWeek">;
  weeklyBadge?: string | null;
};

export function ReviewModeNav({ mode, dateParam, labels, weeklyBadge }: Props) {
  const dayHref = `/review/day?date=${encodeURIComponent(dateParam)}`;
  const weekHref = `/review/week?date=${encodeURIComponent(dateParam)}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav
        className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px]"
        aria-label="Review mode"
      >
        <Link
          href={dayHref}
          className={cn(
            "inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
            mode === "day"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels.tabDay}
        </Link>
        <Link
          href={weekHref}
          className={cn(
            "inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
            mode === "week"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels.tabWeek}
        </Link>
      </nav>
      {weeklyBadge ? (
        <span className="rounded-md bg-secondary px-2.5 py-1 text-sm tabular-nums text-secondary-foreground">
          {weeklyBadge}
        </span>
      ) : null}
    </div>
  );
}

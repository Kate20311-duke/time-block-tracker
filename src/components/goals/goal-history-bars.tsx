import { cn } from "@/lib/utils";
import type { GoalHistoryBar } from "@/lib/goals-detail";

type Props = {
  bars: GoalHistoryBar[];
  ariaLabel: string;
};

function barColor(status: string): string {
  if (status === "achieved") return "bg-primary";
  if (status === "missed") return "bg-destructive/70";
  return "bg-muted-foreground/50";
}

export function GoalHistoryBars({ bars, ariaLabel }: Props) {
  if (bars.length === 0) return null;

  return (
    <div
      className="flex h-32 items-end gap-1 rounded-md border bg-muted/30 p-3"
      role="img"
      aria-label={ariaLabel}
    >
      {bars.map((bar) => (
        <div
          key={bar.key}
          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
          title={`${bar.label}: ${bar.progressPercent}%`}
        >
          <div className="flex h-24 w-full items-end justify-center">
            <div
              className={cn("w-full max-w-6 rounded-sm transition-all", barColor(bar.status))}
              style={{ height: `${Math.max(4, bar.progressPercent)}%` }}
            />
          </div>
          <span className="truncate text-[10px] text-muted-foreground">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

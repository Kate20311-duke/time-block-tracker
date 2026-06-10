import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DailyCompletionQuality } from "@/lib/stats";

type DailyRow = {
  dayStart: Date;
  dayLabel: string;
  totalMinutes: number;
  percent: number;
};

type Props = {
  title: string;
  description: string;
  rows: DailyRow[];
  formatDuration: (minutes: number) => string;
  emptyLabel?: string;
};

export function ReviewDailyBreakdown({
  title,
  description,
  rows,
  formatDuration,
  emptyLabel = "—",
}: Props) {
  const visibleRows = rows.filter((row) => row.totalMinutes > 0);
  const maxMinutes = Math.max(...visibleRows.map((row) => row.totalMinutes), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="flex h-64 items-end justify-between gap-2 sm:gap-3">
            {rows.map((row) => {
              const barHeight =
                row.totalMinutes > 0
                  ? Math.max(8, (row.totalMinutes / maxMinutes) * 100)
                  : 4;
              return (
                <div
                  key={row.dayStart.toISOString()}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {row.totalMinutes > 0
                      ? formatDuration(row.totalMinutes)
                      : "—"}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-primary/85 transition-colors hover:bg-primary"
                    style={{ height: `${barHeight}%` }}
                  />
                  <span className="text-center text-xs text-muted-foreground">
                    {row.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {visibleRows.length > 0 ? (
          <div className="mt-6 flex flex-col gap-3">
            {visibleRows.map((row) => (
              <div key={`progress-${row.dayStart.toISOString()}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{row.dayLabel}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDuration(row.totalMinutes)}
                  </span>
                </div>
                <Progress value={row.percent} />
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function mapDailyBreakdownRows(
  daily: DailyCompletionQuality[],
  locale: "zh" | "en",
  userTimeZone: string,
): DailyRow[] {
  const maxMinutes = Math.max(
    ...daily.map((d) => d.summary.totalPlannedMinutes),
    0,
  );

  return daily.map((d) => ({
    dayStart: d.dayStart,
    dayLabel: new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      timeZone: userTimeZone,
      weekday: "short",
    }).format(d.dayStart),
    totalMinutes: d.summary.totalPlannedMinutes,
    percent:
      maxMinutes > 0
        ? Math.round((d.summary.totalPlannedMinutes / maxMinutes) * 100)
        : 0,
  }));
}

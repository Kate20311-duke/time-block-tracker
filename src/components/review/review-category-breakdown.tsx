import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CategoryTimeMinutes } from "@/lib/stats";

type Row = CategoryTimeMinutes & {
  percent: number;
};

type Props = {
  title: string;
  description: string;
  rows: Row[];
  formatDuration: (minutes: number) => string;
  uncategorizedLabel: string;
  emptyLabel?: string;
};

export function ReviewCategoryBreakdown({
  title,
  description,
  rows,
  formatDuration,
  uncategorizedLabel,
  emptyLabel = "—",
}: Props) {
  const visibleRows = rows.filter((row) => row.totalMinutes > 0);

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
          <div className="flex flex-col gap-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {visibleRows.map((row) => (
                <div
                  key={row.categoryId}
                  style={{
                    width: `${row.percent}%`,
                    backgroundColor: row.categoryColor ?? "#a1a1aa",
                  }}
                  title={`${row.categoryName ?? uncategorizedLabel} ${row.percent}%`}
                />
              ))}
            </div>
            {visibleRows.map((row) => (
              <div key={row.categoryId} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: row.categoryColor ?? "#a1a1aa",
                      }}
                    />
                    <span className="font-medium">
                      {row.categoryName ?? uncategorizedLabel}
                    </span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDuration(row.totalMinutes)} · {row.percent}%
                  </span>
                </div>
                <Progress value={row.percent} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function mapCategoryBreakdownRows(
  rows: CategoryTimeMinutes[],
  totalMinutes: number,
): Row[] {
  return rows.map((row) => ({
    ...row,
    percent:
      totalMinutes > 0
        ? Math.round((row.totalMinutes / totalMinutes) * 100)
        : 0,
  }));
}

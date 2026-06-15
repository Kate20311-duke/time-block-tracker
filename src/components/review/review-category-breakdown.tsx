"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import type { Locale } from "@/lib/i18n/types";
import type { CategoryTimeMinutes } from "@/lib/stats";
import { formatDurationMinutes } from "@/lib/time";

type Row = CategoryTimeMinutes & {
  percent: number;
};

type Props = {
  title: string;
  description: string;
  rows: Row[];
  locale: Locale;
  uncategorizedLabel: string;
  emptyLabel?: string;
};

const chartConfig = {
  minutes: {
    label: "Minutes",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ReviewCategoryBreakdown({
  title,
  description,
  rows,
  locale,
  uncategorizedLabel,
  emptyLabel = "—",
}: Props) {
  const visibleRows = rows.filter((row) => row.totalMinutes > 0);
  const formatDuration = (minutes: number) => formatDurationMinutes(minutes, locale);

  const chartData = visibleRows.map((row) => ({
    categoryId: row.categoryId,
    name: row.categoryName ?? uncategorizedLabel,
    minutes: row.totalMinutes,
    fill: row.categoryColor ?? "#a1a1aa",
  }));

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
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(220px,300px)_1fr] lg:items-start">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square w-full max-h-[260px]"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => {
                        const payload = item.payload as { name?: string };
                        return [
                          formatDuration(Number(value)),
                          payload.name ?? "",
                        ];
                      }}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="minutes"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.categoryId} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

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

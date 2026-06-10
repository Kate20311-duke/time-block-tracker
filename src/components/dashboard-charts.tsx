"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

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

export type DailyBarDatum = {
  dayLabel: string;
  hours: number;
};

export type StatusBarDatum = {
  statusLabel: string;
  count: number;
  color: string;
};

type CategoryProgressRow = {
  name: string;
  color: string;
  totalMinutes: number;
  percent: number;
};

const hoursChartConfig = {
  hours: {
    label: "Hours",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function DashboardCharts(props: {
  dailyBars: DailyBarDatum[];
  statusBars: StatusBarDatum[];
  emptyLabel: string;
  categoryTitle: string;
  categoryDescription: string;
  dailyTitle: string;
  dailyDescription: string;
  statusTitle: string;
  categoryRows: CategoryProgressRow[];
  weekTotalMinutes: number;
}) {
  const { dailyBars, statusBars, categoryRows } = props;
  const hasCategory = categoryRows.some((row) => row.totalMinutes > 0);
  const hasDaily = dailyBars.some((d) => d.hours > 0);
  const hasStatus = statusBars.some((d) => d.count > 0);
  const totalCategoryMinutes = categoryRows.reduce(
    (sum, row) => sum + row.totalMinutes,
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{props.dailyTitle}</CardTitle>
          <CardDescription>{props.dailyDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasDaily ? (
            <ChartContainer config={hoursChartConfig} className="h-64 w-full">
              <BarChart accessibilityLayer data={dailyBars}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="dayLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={28}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar
                  dataKey="hours"
                  fill="var(--color-hours)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">{props.emptyLabel}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{props.categoryTitle}</CardTitle>
          <CardDescription>{props.categoryDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {hasCategory ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {categoryRows.map((row) => (
                  <div
                    key={row.name}
                    style={{
                      width: `${totalCategoryMinutes > 0 ? (row.totalMinutes / totalCategoryMinutes) * 100 : 0}%`,
                      backgroundColor: row.color,
                    }}
                    title={`${row.name} ${row.percent}%`}
                  />
                ))}
              </div>
              {categoryRows.map((row) => (
                <div key={row.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="font-medium">{row.name}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">
                      {row.percent}%
                    </span>
                  </div>
                  <Progress value={row.percent} />
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{props.emptyLabel}</p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>{props.statusTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasStatus ? (
            <ChartContainer
              config={{
                count: { label: "Count", color: "var(--chart-1)" },
              }}
              className="h-56 w-full"
            >
              <BarChart accessibilityLayer data={statusBars}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="statusLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={28}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusBars.map((entry) => (
                    <Cell key={entry.statusLabel} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">{props.emptyLabel}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

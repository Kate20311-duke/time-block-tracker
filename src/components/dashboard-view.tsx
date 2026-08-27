import type { ReactNode } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Timer,
} from "lucide-react";

import {
  DashboardActiveTimer,
  type DashboardRunningSession,
} from "@/components/dashboard-active-timer";
import { DashboardGoalsPreview, type DashboardGoalPreviewItem } from "@/components/dashboard-goals-preview";
import { DashboardCharts } from "@/components/dashboard-charts";
import { DashboardOnboardingCard } from "@/components/dashboard-onboarding-card";
import { DashboardQuickStart, type QuickStartCategory } from "@/components/dashboard-quick-start";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatMessage } from "@/lib/i18n";
import type { DailyBarDatum, StatusBarDatum } from "@/components/dashboard-charts";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { formatDurationMinutes } from "@/lib/time";
import { UNCATEGORIZED_ID } from "@/lib/stats";
import { FOCUS_CATEGORY_REMOVED_ID } from "@/lib/focus-category-display";

type CategoryRow = {
  categoryId: string;
  categoryName: string | null;
  categoryColor: string | null;
  totalMinutes: number;
  blockCount: number;
};

type FocusCategoryRow = {
  categoryId: string;
  categoryName: string | null;
  categoryColor: string | null;
  totalMinutes: number;
  sessionCount: number;
  convertedSessionCount: number;
};

type RecentBlock = {
  id: string;
  title: string;
  categoryName: string;
  categoryColor: string;
  dateLabel: string;
  timeRangeLabel: string;
  durationLabel: string;
};

type FocusSummary = {
  totalFocusMinutes: number;
  convertedFocusMinutes: number;
  unconvertedFocusMinutes: number;
  completedCount: number;
  abandonedCount: number;
  convertedCount: number;
  completionRate: number;
  categoryBreakdown: FocusCategoryRow[];
};

export type DashboardViewProps = {
  locale: Locale;
  t: Dictionary;
  todayRecordedLabel: string;
  weekRecordedLabel: string;
  focusSessionsLabel: string;
  completedBlocksLabel: string;
  completionRateLabel: string;
  runningSession: DashboardRunningSession | null;
  startedAtLabel: string;
  quickStartCategories: QuickStartCategory[];
  hasActiveSession: boolean;
  dailyBars: DailyBarDatum[];
  statusBars: StatusBarDatum[];
  weekCategoryMinutes: CategoryRow[];
  weekTotalMinutesForBreakdown: number;
  weekBlockCount: number;
  weekFocusSummary: FocusSummary;
  todayFocusSummary: FocusSummary;
  recentBlocks: RecentBlock[];
  showOnboarding: boolean;
  onboardingSteps: {
    step1Done: boolean;
    step2Done: boolean;
    step3Done: boolean;
  };
  goalPreviewItems: DashboardGoalPreviewItem[];
};

const statIcons = [Clock, CalendarIcon, Timer, CheckCircle2] as const;

export function DashboardView({
  locale,
  t,
  todayRecordedLabel,
  weekRecordedLabel,
  focusSessionsLabel,
  completedBlocksLabel,
  completionRateLabel,
  runningSession,
  startedAtLabel,
  quickStartCategories,
  hasActiveSession,
  dailyBars,
  statusBars,
  weekCategoryMinutes,
  weekTotalMinutesForBreakdown,
  weekBlockCount,
  weekFocusSummary,
  todayFocusSummary,
  recentBlocks,
  showOnboarding,
  onboardingSteps,
  goalPreviewItems,
}: DashboardViewProps) {
  const statCards = [
    {
      label: t.dashboard.todayTotalRecordedTime,
      value: todayRecordedLabel,
    },
    {
      label: t.dashboard.weekTotalRecordedTime,
      value: weekRecordedLabel,
    },
    {
      label: t.dashboard.focusSessionsStat,
      value: focusSessionsLabel,
    },
    {
      label: t.dashboard.completedBlocksStat,
      value: completedBlocksLabel,
      hint: completionRateLabel,
    },
  ];

  const categoryRows = weekCategoryMinutes.filter((row) => row.totalMinutes > 0);

  const onboardingStepItems = showOnboarding
    ? [
        {
          id: "category",
          done: onboardingSteps.step1Done,
          title: t.onboarding.step1Title,
          description: t.onboarding.step1Description,
          href: "/categories",
          actionLabel: t.onboarding.step1Action,
        },
        {
          id: "record",
          done: onboardingSteps.step2Done,
          title: t.onboarding.step2Title,
          description: t.onboarding.step2Description,
          href: "/calendar",
          actionLabel: t.onboarding.step2Action,
        },
        {
          id: "review",
          done: onboardingSteps.step3Done,
          title: t.onboarding.step3Title,
          description: t.onboarding.step3Description,
          href: "/review/week",
          actionLabel: t.onboarding.step3Action,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {showOnboarding ? (
        <DashboardOnboardingCard steps={onboardingStepItems} labels={t.onboarding} />
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = statIcons[index]!;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                <span className="text-2xl font-semibold tracking-tight">
                  {stat.value}
                </span>
                {stat.hint ? (
                  <Badge variant="secondary" className="w-fit">
                    {stat.hint}
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardActiveTimer
          session={runningSession}
          startedAtLabel={startedAtLabel}
          labels={{
            activeTimer: t.dashboard.activeTimer,
            activeTimerEmpty: t.dashboard.activeTimerEmpty,
            goToFocus: t.dashboard.goToFocus,
            manageOnFocusPage: t.dashboard.manageOnFocusPage,
            activeTimerPaused: t.dashboard.activeTimerPaused,
            stopwatchTimerAria: t.focus.stopwatchTimerAria,
            defaultTimeBlockTitle: t.focus.defaultTimeBlockTitle,
          }}
        />
        <DashboardQuickStart
          categories={quickStartCategories}
          hasActiveSession={hasActiveSession}
          labels={{
            quickStart: t.dashboard.quickStart,
            quickStartHint: t.dashboard.quickStartHint,
            customTimer: t.dashboard.customTimer,
            quickStartActiveSession: t.dashboard.quickStartActiveSession,
            stopwatchStart: t.focus.stopwatchStart,
            errors: t.focus.errors,
          }}
        />
      </div>

      <DashboardGoalsPreview
        locale={locale}
        items={goalPreviewItems}
        labels={{
          title: t.dashboard.goalsPreviewTitle,
          description: t.dashboard.goalsPreviewDescription,
          empty: t.dashboard.goalsPreviewEmpty,
          emptyHint: t.goals.previewEmptyHint,
          viewAll: t.dashboard.goalsPreviewViewAll,
          progressOf: t.goals.progressOf,
          progressCount: t.goals.metrics.progressCount,
          streak: t.dashboard.goalsPreviewStreak,
        }}
      />

      <DashboardCharts
        dailyBars={dailyBars}
        statusBars={statusBars}
        emptyLabel={t.dashboard.emptyChart}
        categoryTitle={t.dashboard.categoryDistribution}
        categoryDescription={t.dashboard.categoryShareHint}
        dailyTitle={t.dashboard.weeklyDistribution}
        dailyDescription={t.dashboard.weeklyDistributionHint}
        statusTitle={t.dashboard.completionStatusChart}
        categoryRows={categoryRows.map((row) => ({
          name:
            row.categoryId === UNCATEGORIZED_ID
              ? t.dashboard.uncategorized
              : row.categoryName ?? t.dashboard.uncategorized,
          color:
            row.categoryId === UNCATEGORIZED_ID
              ? "#a1a1aa"
              : row.categoryColor ?? "#a1a1aa",
          totalMinutes: row.totalMinutes,
          percent:
            weekTotalMinutesForBreakdown > 0
              ? Math.round((row.totalMinutes / weekTotalMinutesForBreakdown) * 100)
              : 0,
        }))}
        weekTotalMinutes={weekTotalMinutesForBreakdown}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.recentBlocks}</CardTitle>
          <CardDescription>{t.dashboard.recentBlocksHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          {recentBlocks.length === 0 ? (
            <EmptyState
              title={t.dashboard.noData}
              description={t.dashboard.recentEmptyHint}
              actions={[
                { label: t.dashboard.goToCalendar, href: "/calendar" },
                {
                  label: t.dashboard.goToFocusStopwatch,
                  href: "/focus?mode=stopwatch",
                  variant: "outline",
                },
              ]}
              className="border-0 shadow-none"
            />
          ) : (
            recentBlocks.map((block, index) => (
              <div key={block.id}>
                {index > 0 ? <Separator /> : null}
                <div className="flex items-center gap-4 py-3">
                  <span
                    className="h-10 w-1 rounded-full"
                    style={{ backgroundColor: block.categoryColor }}
                  />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="font-medium">{block.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {block.categoryName} · {block.dateLabel}
                    </span>
                  </div>
                  <div className="hidden text-sm text-muted-foreground sm:block">
                    {block.timeRangeLabel}
                  </div>
                  <Badge variant="outline" className="tabular-nums">
                    {block.durationLabel}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t.dashboard.focusSection}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.dashboard.focusSectionNote}
          </p>
        </div>

        {weekFocusSummary.completedCount === 0 &&
        weekFocusSummary.abandonedCount === 0 ? (
          <p className="text-sm text-muted-foreground">{t.dashboard.focusNoData}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>{t.dashboard.focusWeekTime}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatDurationMinutes(weekFocusSummary.totalFocusMinutes, locale)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.dashboard.focusWeekTimeHint}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t.dashboard.focusConvertedFocusMinutes}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatDurationMinutes(weekFocusSummary.convertedFocusMinutes, locale)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {t.dashboard.focusUnconvertedFocusMinutes}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatDurationMinutes(
                  weekFocusSummary.unconvertedFocusMinutes,
                  locale,
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t.dashboard.focusTodayTime}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatDurationMinutes(todayFocusSummary.totalFocusMinutes, locale)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t.dashboard.focusCompletedSessions}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {String(weekFocusSummary.completedCount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t.dashboard.focusCompletionRate}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {`${Math.round(weekFocusSummary.completionRate * 100)}%`}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/focus">{t.nav.focus}</ButtonLink>
          <ButtonLink href="/review/day">{t.review.dayTitle}</ButtonLink>
          <ButtonLink href="/review/week">{t.review.weekTitle}</ButtonLink>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.dashboard.focusByCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            {weekFocusSummary.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.dashboard.focusNoData}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {weekFocusSummary.categoryBreakdown.map((row) => {
                  const name =
                    row.categoryId === FOCUS_CATEGORY_REMOVED_ID
                      ? t.focus.categoryRemoved
                      : row.categoryId === UNCATEGORIZED_ID
                        ? t.dashboard.uncategorized
                        : row.categoryName ?? t.focus.categoryRemoved;
                  const color =
                    row.categoryId === FOCUS_CATEGORY_REMOVED_ID ||
                    row.categoryId === UNCATEGORIZED_ID
                      ? undefined
                      : row.categoryColor ?? undefined;
                  const swatchClass =
                    color == null ? "bg-muted-foreground/40" : "";
                  const percent =
                    weekFocusSummary.totalFocusMinutes > 0
                      ? Math.round(
                          (row.totalMinutes / weekFocusSummary.totalFocusMinutes) * 100,
                        )
                      : 0;

                  return (
                    <li key={row.categoryId} className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2.5 rounded-full ${swatchClass}`}
                            style={color ? { backgroundColor: color } : undefined}
                          />
                          <span className="font-medium">{name}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">
                          {formatDurationMinutes(row.totalMinutes, locale)} · {percent}%
                        </span>
                      </div>
                      <Progress value={percent} />
                      <p className="text-xs text-muted-foreground">
                        {formatMessage(t.dashboard.focusSessionCount, {
                          count: row.sessionCount,
                        })}
                        {row.convertedSessionCount > 0
                          ? ` · ${formatMessage(t.dashboard.focusConvertedInCategory, {
                              count: row.convertedSessionCount,
                            })}`
                          : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t.dashboard.byCategory}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.dashboard.timeBlocksSectionNote}
          </p>
        </div>
        {weekBlockCount === 0 ? (
          <p className="text-sm text-muted-foreground">{t.dashboard.noData}</p>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col gap-3">
                {weekCategoryMinutes.map((row) => {
                  const name =
                    row.categoryId === UNCATEGORIZED_ID
                      ? t.dashboard.uncategorized
                      : row.categoryName ?? t.dashboard.uncategorized;
                  const color =
                    row.categoryId === UNCATEGORIZED_ID
                      ? "#a1a1aa"
                      : row.categoryColor ?? "#a1a1aa";
                  const percent =
                    weekTotalMinutesForBreakdown > 0
                      ? Math.round((row.totalMinutes / weekTotalMinutesForBreakdown) * 100)
                      : 0;

                  return (
                    <li key={row.categoryId} className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-medium">{name}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">
                          {formatDurationMinutes(row.totalMinutes, locale)} · {percent}%
                        </span>
                      </div>
                      <Progress value={percent} />
                      <p className="text-xs text-muted-foreground">
                        {formatMessage(t.dashboard.blockCount, { count: row.blockCount })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function ButtonLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
    >
      {children}
    </Link>
  );
}

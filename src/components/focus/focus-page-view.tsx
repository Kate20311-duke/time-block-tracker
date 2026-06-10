"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { FocusHistory, type FocusHistoryItem } from "@/components/focus-history";
import { FocusTimer, type OrphanRunningPomodoro } from "@/components/focus-timer";
import {
  StopwatchTimer,
  type RunningStopwatchSession,
} from "@/components/stopwatch-timer";
import { FocusPageHeader } from "@/components/focus/focus-page-header";
import { FocusRunningBanner } from "@/components/focus/focus-running-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FocusCategoryOption } from "@/components/focus-timer";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type FocusMode = "stopwatch" | "pomodoro";

type Props = {
  categories: FocusCategoryOption[];
  labels: Dictionary["focus"];
  locale: Locale;
  statusLabels: Dictionary["status"];
  timeBlockLabels: Pick<Dictionary["timeBlocks"], "status" | "completionRange">;
  runningStopwatch: RunningStopwatchSession | null;
  anotherSessionRunning: boolean;
  orphanRunningPomodoro: OrphanRunningPomodoro | null;
  historyItems: FocusHistoryItem[];
  cancelLabel: string;
  confirmDeleteTitle: string;
};

function resolveDefaultTab(
  modeParam: string | null,
  runningStopwatch: RunningStopwatchSession | null,
  orphanRunningPomodoro: OrphanRunningPomodoro | null,
): FocusMode {
  if (modeParam === "pomodoro") {
    return "pomodoro";
  }
  if (modeParam === "stopwatch") {
    return "stopwatch";
  }
  if (runningStopwatch) {
    return "stopwatch";
  }
  if (orphanRunningPomodoro) {
    return "pomodoro";
  }
  return "stopwatch";
}

export function FocusPageView({
  categories,
  labels,
  locale,
  statusLabels,
  timeBlockLabels,
  runningStopwatch,
  anotherSessionRunning,
  orphanRunningPomodoro,
  historyItems,
  cancelLabel,
  confirmDeleteTitle,
}: Props) {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const categoryParam = searchParams.get("category");

  const defaultTab = useMemo(
    () => resolveDefaultTab(modeParam, runningStopwatch, orphanRunningPomodoro),
    [modeParam, runningStopwatch, orphanRunningPomodoro],
  );

  const initialCategoryId = useMemo(() => {
    if (!categoryParam) {
      return "";
    }
    return categories.some((category) => category.id === categoryParam)
      ? categoryParam
      : "";
  }, [categoryParam, categories]);

  const showStopwatchBanner =
    runningStopwatch !== null && defaultTab !== "stopwatch";
  const showPomodoroBanner =
    orphanRunningPomodoro !== null && defaultTab !== "pomodoro";

  return (
    <div className="flex flex-col gap-6">
      <FocusPageHeader
        labels={{
          pageTitle: labels.pageTitle,
          pageDescription: labels.pageDescription,
        }}
      />

      {showStopwatchBanner && runningStopwatch ? (
        <FocusRunningBanner
          mode="stopwatch"
          title={runningStopwatch.title}
          categoryName={runningStopwatch.category.name}
          categoryColor={runningStopwatch.category.color}
          startTimeIso={runningStopwatch.startTime}
          labels={labels}
        />
      ) : null}

      {showPomodoroBanner && orphanRunningPomodoro ? (
        <FocusRunningBanner
          mode="pomodoro"
          title={orphanRunningPomodoro.title}
          categoryName={orphanRunningPomodoro.categoryName}
          categoryColor={orphanRunningPomodoro.categoryColor}
          plannedDurationMinutes={orphanRunningPomodoro.plannedDurationMinutes}
          labels={labels}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Tabs defaultValue={defaultTab} className="gap-4">
            <TabsList>
              <TabsTrigger value="stopwatch">{labels.tabStopwatch}</TabsTrigger>
              <TabsTrigger value="pomodoro">{labels.tabPomodoro}</TabsTrigger>
            </TabsList>

            <TabsContent value="stopwatch" className="mt-0">
              <StopwatchTimer
                categories={categories}
                labels={labels}
                locale={locale}
                statusLabels={statusLabels}
                timeBlockLabels={timeBlockLabels}
                initialRunningSession={runningStopwatch}
                anotherSessionRunning={anotherSessionRunning}
                initialCategoryId={initialCategoryId}
                cancelLabel={cancelLabel}
                confirmDeleteTitle={confirmDeleteTitle}
              />
            </TabsContent>

            <TabsContent value="pomodoro" className="mt-0">
              <FocusTimer
                categories={categories}
                labels={labels}
                sessionBlocked={
                  anotherSessionRunning || runningStopwatch !== null
                }
                orphanRunningPomodoro={orphanRunningPomodoro}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <FocusHistory
            sessions={historyItems}
            labels={labels}
            locale={locale}
            cancelLabel={cancelLabel}
            confirmDeleteTitle={confirmDeleteTitle}
          />
        </div>
      </div>
    </div>
  );
}

import type { GoalMetric } from "@/lib/constants";
import { GOAL_METRICS } from "@/lib/constants";
import { formatDurationMinutes } from "@/lib/time";
import type { Locale } from "@/lib/i18n/types";

export function isValidGoalMetric(metric: string): metric is GoalMetric {
  return (GOAL_METRICS as readonly string[]).includes(metric);
}

export function isGoalMinuteMetric(metric: string): boolean {
  return metric === "time_block_minutes" || metric === "focus_minutes";
}

export function isGoalCountMetric(metric: string): boolean {
  return metric === "completed_blocks_count" || metric === "focus_sessions_count";
}

export function isGoalTimeBlockMetric(metric: string): boolean {
  return metric === "time_block_minutes" || metric === "completed_blocks_count";
}

export function isGoalFocusMetric(metric: string): boolean {
  return metric === "focus_minutes" || metric === "focus_sessions_count";
}

/** Format a stored progress value for display (minutes or count). */
export function formatGoalProgressValue(
  metric: string,
  value: number,
  locale: Locale,
): string {
  if (isGoalCountMetric(metric)) {
    return String(Math.round(value));
  }
  return formatDurationMinutes(value, locale);
}

export type GoalProgressFormatLabels = {
  progressOf: string;
  progressCount: string;
  remaining: string;
  remainingCount: string;
};

export function formatGoalProgressPair(
  metric: string,
  actual: number,
  target: number,
  locale: Locale,
  labels: GoalProgressFormatLabels,
): string {
  const actualLabel = formatGoalProgressValue(metric, actual, locale);
  const targetLabel = formatGoalProgressValue(metric, target, locale);
  const template = isGoalCountMetric(metric) ? labels.progressCount : labels.progressOf;
  return template
    .replace("{actual}", actualLabel)
    .replace("{target}", targetLabel);
}

export function formatGoalRemaining(
  metric: string,
  remaining: number,
  locale: Locale,
  labels: Pick<GoalProgressFormatLabels, "remaining" | "remainingCount">,
): string {
  const valueLabel = formatGoalProgressValue(metric, remaining, locale);
  const template = isGoalCountMetric(metric) ? labels.remainingCount : labels.remaining;
  return template.replace("{minutes}", valueLabel).replace("{count}", valueLabel);
}

/** Form default for minute metrics (hours input). */
export function goalTargetToHoursInput(targetMinutes: number): string {
  return String(Math.round((targetMinutes / 60) * 10) / 10);
}

/** Form default for count metrics. */
export function goalTargetToCountInput(targetMinutes: number): string {
  return String(Math.round(targetMinutes));
}

export function goalTargetToFormInput(metric: string, targetMinutes: number): string {
  return isGoalCountMetric(metric)
    ? goalTargetToCountInput(targetMinutes)
    : goalTargetToHoursInput(targetMinutes);
}

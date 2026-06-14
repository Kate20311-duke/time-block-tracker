export const TIME_BLOCK_STATUSES = [
  "planned",
  "completed",
  "partial",
  "skipped",
] as const;

export type TimeBlockStatus = (typeof TIME_BLOCK_STATUSES)[number];

export const TIME_BLOCK_EFFICIENCY_LEVELS = ["low", "medium", "high"] as const;

export type TimeBlockEfficiencyLevel =
  (typeof TIME_BLOCK_EFFICIENCY_LEVELS)[number];

export const FOCUS_SESSION_STATUSES = [
  "planned",
  "running",
  "paused",
  "completed",
  "abandoned",
  "converted",
  "failed",
] as const;

export type FocusSessionStatus = (typeof FOCUS_SESSION_STATUSES)[number];

/** Maximum pause attempts per stopwatch focus session (server-enforced). */
export const MAX_FOCUS_PAUSES = 2;

export const FOCUS_SESSION_MODES = ["pomodoro", "stopwatch"] as const;

export type FocusSessionMode = (typeof FOCUS_SESSION_MODES)[number];

/** Placeholder for stopwatch sessions; UI uses elapsed time, not this value. */
export const STOPWATCH_PLANNED_DURATION_PLACEHOLDER_MINUTES = 1;

export const TIME_BLOCK_SOURCES = [
  "manual",
  "pomodoro",
  "stopwatch",
  "ics_import",
] as const;

export type TimeBlockSource = (typeof TIME_BLOCK_SOURCES)[number];

export const GOAL_METRICS = ["time_block_minutes"] as const;

export type GoalMetric = (typeof GOAL_METRICS)[number];

export const GOAL_TYPES = ["one_time", "recurring"] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_PERIODS = ["once", "daily", "weekly"] as const;

export type GoalPeriodKind = (typeof GOAL_PERIODS)[number];

export const GOAL_PERIOD_STATUSES = ["active", "achieved", "missed"] as const;

export type GoalPeriodStatus = (typeof GOAL_PERIOD_STATUSES)[number];

export const NAV_ROUTES = [
  { href: "/" },
  { href: "/categories" },
  { href: "/time-blocks" },
  { href: "/calendar" },
  { href: "/dashboard" },
] as const;

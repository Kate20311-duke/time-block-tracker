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
  "completed",
  "abandoned",
  "converted",
] as const;

export type FocusSessionStatus = (typeof FOCUS_SESSION_STATUSES)[number];

export const NAV_ROUTES = [
  { href: "/" },
  { href: "/categories" },
  { href: "/time-blocks" },
  { href: "/calendar" },
  { href: "/dashboard" },
] as const;

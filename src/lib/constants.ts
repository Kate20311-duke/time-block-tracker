export const TIME_BLOCK_STATUSES = [
  "planned",
  "completed",
  "partial",
  "skipped",
] as const;

export type TimeBlockStatus = (typeof TIME_BLOCK_STATUSES)[number];

export const NAV_ROUTES = [
  { href: "/" },
  { href: "/categories" },
  { href: "/time-blocks" },
  { href: "/calendar" },
  { href: "/dashboard" },
] as const;

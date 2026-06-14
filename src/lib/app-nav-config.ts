import {
  BarChart3,
  Blocks,
  Calendar,
  LayoutDashboard,
  Repeat,
  Settings,
  Sparkles,
  Tags,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

export type AppNavLabelKey = keyof Pick<
  Dictionary["nav"],
  | "overview"
  | "calendar"
  | "focus"
  | "timeBlocks"
  | "categories"
  | "review"
  | "assistant"
  | "routines"
  | "goals"
  | "settings"
>;

export type AppNavItem = {
  href: string;
  labelKey: AppNavLabelKey;
  icon: LucideIcon;
  matchPrefix?: boolean;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", labelKey: "overview", icon: LayoutDashboard },
  { href: "/calendar", labelKey: "calendar", icon: Calendar },
  { href: "/focus", labelKey: "focus", icon: Timer },
  { href: "/time-blocks", labelKey: "timeBlocks", icon: Blocks },
  { href: "/categories", labelKey: "categories", icon: Tags },
  { href: "/routines", labelKey: "routines", icon: Repeat },
  { href: "/goals", labelKey: "goals", icon: Target },
  { href: "/review", labelKey: "review", icon: BarChart3, matchPrefix: true },
  { href: "/assistant", labelKey: "assistant", icon: Sparkles },
  { href: "/settings", labelKey: "settings", icon: Settings },
];

export const APP_ROUTE_PREFIXES = [
  "/assistant",
  "/categories",
  "/goals",
  "/routines",
  "/settings",
  "/time-blocks",
  "/calendar",
  "/dashboard",
  "/focus",
  "/review",
] as const;

export function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isNavItemActive(pathname: string, item: AppNavItem): boolean {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function resolveAppNavTitle(
  pathname: string,
  labels: Pick<Dictionary["nav"], AppNavLabelKey>,
): string {
  const item = APP_NAV_ITEMS.find((entry) => isNavItemActive(pathname, entry));
  return item ? labels[item.labelKey] : labels.overview;
}

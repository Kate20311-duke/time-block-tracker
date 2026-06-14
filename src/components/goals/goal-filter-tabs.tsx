import Link from "next/link";

import type { GoalListFilter } from "@/lib/goals";

type Props = {
  current: GoalListFilter;
  labels: {
    active: string;
    history: string;
    missed: string;
    inactive: string;
    all: string;
  };
};

const FILTERS: GoalListFilter[] = ["active", "history", "missed", "inactive", "all"];

export function GoalFilterTabs({ current, labels }: Props) {
  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label={labels.all}
    >
      {FILTERS.map((filter) => {
        const label =
          filter === "active"
            ? labels.active
            : filter === "history"
              ? labels.history
              : filter === "missed"
                ? labels.missed
                : filter === "inactive"
                  ? labels.inactive
                  : labels.all;
        const isActive = current === filter;
        return (
          <Link
            key={filter}
            href={filter === "active" ? "/goals" : `/goals?filter=${filter}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

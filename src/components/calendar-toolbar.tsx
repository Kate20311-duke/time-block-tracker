import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/types";
import type { CalendarView } from "@/lib/calendar";

type Props = {
  view: CalendarView;
  heading: string;
  weekViewHref: string;
  dayViewHref: string;
  prevHref: string;
  nextHref: string;
  todayHref?: string;
  todayLabel: string;
  prevLabel: string;
  nextLabel: string;
  labels: Pick<
    Dictionary["calendar"],
    "viewSwitcherAria" | "weekView" | "dayView" | "dateNavAria"
  >;
};

export function CalendarToolbar({
  view,
  heading,
  weekViewHref,
  dayViewHref,
  prevHref,
  nextHref,
  todayHref,
  todayLabel,
  prevLabel,
  nextLabel,
  labels,
}: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-lg font-semibold tracking-tight">{heading}</p>

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-lg bg-muted p-[3px]"
          role="group"
          aria-label={labels.viewSwitcherAria}
        >
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 rounded-md px-2.5",
              view === "week" && "bg-background shadow-sm",
            )}
            asChild
          >
            <Link href={weekViewHref}>{labels.weekView}</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 rounded-md px-2.5",
              view === "day" && "bg-background shadow-sm",
            )}
            asChild
          >
            <Link href={dayViewHref}>{labels.dayView}</Link>
          </Button>
        </div>

        <nav
          aria-label={labels.dateNavAria}
          className="flex flex-wrap items-center gap-1"
        >
          <Button variant="outline" size="sm" asChild>
            <Link href={prevHref} aria-label={prevLabel}>
              <ChevronLeft data-icon="inline-start" />
              <span className="hidden sm:inline">{prevLabel}</span>
            </Link>
          </Button>
          {todayHref ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={todayHref}>{todayLabel}</Link>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" asChild>
            <Link href={nextHref} aria-label={nextLabel}>
              <span className="hidden sm:inline">{nextLabel}</span>
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
        </nav>
      </div>
    </div>
  );
}

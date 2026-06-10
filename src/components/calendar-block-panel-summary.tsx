import { Badge } from "@/components/ui/badge";
import { TimeBlockStatusBadge } from "@/components/time-blocks/time-block-status-badge";
import { formatDateTimeInTimeZone } from "@/lib/time";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  locale: Locale;
  userTimeZone: string;
  categoryName: string;
  categoryColor: string;
  startTimeIso: string;
  endTimeIso: string;
  status: string;
  completionLevel: number;
  completionLabel: string;
  durationLabel: string;
  note: string | null;
};

export function CalendarBlockPanelSummary({
  locale,
  userTimeZone,
  categoryName,
  categoryColor,
  startTimeIso,
  endTimeIso,
  status,
  completionLevel,
  completionLabel,
  durationLabel,
  note,
}: Props) {
  const startTime = new Date(startTimeIso);
  const endTime = new Date(endTimeIso);
  const dateLabel = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeZone: userTimeZone,
  }).format(startTime);

  return (
    <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColor }}
          aria-hidden
        />
        <Badge variant="outline">{categoryName}</Badge>
        <TimeBlockStatusBadge
          status={status}
          completionLevel={completionLevel}
          locale={locale}
          completionLabel={completionLabel}
        />
        <Badge variant="outline" className="tabular-nums">
          {durationLabel}
        </Badge>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{dateLabel}</dt>
        </div>
        <div className="tabular-nums text-muted-foreground sm:text-right">
          {formatDateTimeInTimeZone(startTime, userTimeZone, locale)} –{" "}
          {formatDateTimeInTimeZone(endTime, userTimeZone, locale)}
        </div>
      </dl>
      {note ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note}</p>
      ) : null}
    </div>
  );
}

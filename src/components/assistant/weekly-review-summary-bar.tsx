import {
  Card,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import type { TimeReviewSummary } from "@/lib/assistant/weekly-review-types";
import { formatMessage } from "@/lib/i18n";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { formatDurationMinutes } from "@/lib/time";

type Props = {
  summary: TimeReviewSummary;
  labels: Dictionary["assistant"];
  locale: Locale;
  dataScopeNote: string;
};

export function WeeklyReviewSummaryBar({
  summary,
  labels,
  locale,
  dataScopeNote,
}: Props) {
  const recordedLabel = formatDurationMinutes(
    summary.totalRecordedMinutes,
    locale,
  );
  const categoriesLabel =
    summary.activeCategories.length > 0
      ? summary.activeCategories.map((category) => category.name).join(
          locale === "zh" ? "、" : ", ",
        )
      : labels.noCategoriesUsed;
  const focusLabel = formatMessage(labels.focusSessionsStat, {
    total: String(summary.focusSessions.totalCount),
    completed: String(summary.focusSessions.completedCount),
  });
  const dateSeparator = locale === "zh" ? "至" : "to";
  const showDataQualityNote =
    summary.dataQuality.level === "low" ||
    summary.dataQuality.level === "medium";

  return (
    <Card size="sm" className="border-dashed">
      <CardContent className="space-y-3 pt-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium text-foreground">
              {labels.recordedTotal}：
            </span>
            <span className="text-muted-foreground">{recordedLabel}</span>
          </p>
          <p>
            <span className="font-medium text-foreground">
              {labels.categoriesUsed}：
            </span>
            <span className="text-muted-foreground">{categoriesLabel}</span>
          </p>
          <p className="sm:col-span-2">
            <span className="font-medium text-foreground">{focusLabel}</span>
          </p>
        </div>
        <CardDescription className="text-xs">
          {labels.totalTimeNote}
        </CardDescription>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {labels.dataRangeLabel}：
          </span>
          {summary.range.start} {dateSeparator} {summary.range.end}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {labels.dataScopeLabel}：
          </span>
          {dataScopeNote}
        </p>
        {showDataQualityNote ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {summary.dataQuality.note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

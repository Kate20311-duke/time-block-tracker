import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssistantSourceNotice } from "@/components/assistant/assistant-source-notice";
import { CopyReviewButton } from "@/components/assistant/copy-review-button";
import { WeeklyReviewSummaryBar } from "@/components/assistant/weekly-review-summary-bar";
import type {
  TimeReviewResponse,
  TimeReviewResult,
} from "@/lib/assistant/weekly-review-types";
import { formatWeeklyReviewPlainText } from "@/lib/assistant/format-review-copy";
import type { Dictionary, Locale } from "@/lib/i18n/types";

function ReviewSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

type Props = {
  response: TimeReviewResponse;
  labels: Dictionary["assistant"];
  locale: Locale;
  loading?: boolean;
};

export function WeeklyReviewCard({
  response,
  labels,
  locale,
  loading = false,
}: Props) {
  const { summary, review, source } = response;
  const dataScopeNote =
    review.dataScopeNote.trim() ||
    summary.dataScopeNote.trim() ||
    labels.dataScopeNote;
  const dateSeparator = locale === "zh" ? "至" : "to";

  return (
    <Card className={loading ? "opacity-70 transition-opacity" : undefined}>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{labels.resultTitle}</CardTitle>
            <CardDescription>
              {labels.dataRangeLabel}：{summary.range.start} {dateSeparator}{" "}
              {summary.range.end}
            </CardDescription>
          </div>
          <CopyReviewButton
            label={labels.copyReviewButton}
            copiedLabel={labels.copySuccess}
            failedLabel={labels.copyFailed}
            disabled={loading}
            getText={() => formatWeeklyReviewPlainText(response, labels, locale)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <WeeklyReviewSummaryBar
          summary={summary}
          labels={labels}
          locale={locale}
          dataScopeNote={dataScopeNote}
        />

        <AssistantSourceNotice source={source} labels={labels} />

        <ReviewBody review={review} labels={labels} />
      </CardContent>
    </Card>
  );
}

function ReviewBody({
  review,
  labels,
}: {
  review: TimeReviewResult;
  labels: Dictionary["assistant"];
}) {
  return (
    <>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">{labels.summarySection}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {review.summary}
        </p>
      </section>

      <ReviewSection title={labels.findingsSection} items={review.findings} />
      <ReviewSection
        title={labels.potentialIssuesSection}
        items={review.potentialIssues}
      />
      <ReviewSection title={labels.positivesSection} items={review.positives} />
      <ReviewSection
        title={labels.suggestionsSection}
        items={review.suggestions}
      />

      {review.actionItems.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">{labels.actionItemsSection}</h3>
          <ol className="space-y-3">
            {review.actionItems.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="rounded-lg border border-border bg-muted/30 px-4 py-3"
              >
                <p className="text-sm font-medium">
                  {index + 1}. {item.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}

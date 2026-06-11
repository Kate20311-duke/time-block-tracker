import { Badge } from "@/components/ui/badge";
import { getAssistantSourceNoticeKind } from "@/lib/assistant/source-display";
import type { TimeReviewSource } from "@/lib/assistant/weekly-review-types";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  source: TimeReviewSource;
  labels: Dictionary["assistant"];
};

export function AssistantSourceNotice({ source, labels }: Props) {
  const kind = getAssistantSourceNoticeKind(source);

  if (kind === "none") return null;

  if (kind === "production") {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
        {labels.sourceProductionNotice}
      </p>
    );
  }

  if (kind === "dev-fallback") {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
        {labels.sourceFallbackNotice}
      </p>
    );
  }

  if (kind === "dev-mock") {
    return (
      <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        {labels.sourceMockDevNotice}
      </p>
    );
  }

  return (
    <Badge variant="secondary" className="w-fit">
      {labels.sourceDeepseekNotice}
    </Badge>
  );
}

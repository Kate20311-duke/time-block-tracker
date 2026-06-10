import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Locale } from "@/lib/i18n/types";
import { getStatusLabel } from "@/lib/i18n";

export type ReviewTimeBlockListItem = {
  id: string;
  title: string;
  status: string;
  categoryName: string;
  categoryColor: string;
  durationLabel: string;
  timeRangeLabel: string;
  reviewNote: string | null;
};

type Props = {
  title: string;
  items: ReviewTimeBlockListItem[];
  locale: Locale;
  emptyLabel?: string;
  showStatus?: boolean;
};

export function ReviewTimeBlockList({
  title,
  items,
  locale,
  emptyLabel = "—",
  showStatus = true,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="flex flex-col">
            {items.map((item, index) => (
              <div key={item.id}>
                {index > 0 ? <Separator /> : null}
                <div className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="h-10 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: item.categoryColor }}
                          aria-hidden
                        />
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-3">
                        <Badge variant="outline">{item.categoryName}</Badge>
                        {showStatus ? (
                          <Badge variant="secondary">
                            {getStatusLabel(item.status, locale)}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="tabular-nums">
                          {item.durationLabel}
                        </Badge>
                      </div>
                      <p className="pl-3 text-sm text-muted-foreground">
                        {item.timeRangeLabel}
                      </p>
                      {item.reviewNote ? (
                        <p className="pl-3 text-sm text-muted-foreground whitespace-pre-wrap">
                          {item.reviewNote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

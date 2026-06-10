import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  status: string;
  completionLevel: number;
  locale: Locale;
  completionLabel: string;
};

export function TimeBlockStatusBadge({
  status,
  completionLevel,
  locale,
  completionLabel,
}: Props) {
  return (
    <>
      <Badge variant="secondary">{getStatusLabel(status, locale)}</Badge>
      {status === "partial" ? (
        <Badge variant="outline" className="tabular-nums">
          {completionLabel}: {completionLevel}%
        </Badge>
      ) : null}
    </>
  );
}

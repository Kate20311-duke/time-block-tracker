import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusLabel } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  title: string;
  categoryName: string;
  color: string;
  timeLabel: string;
  locale: Locale;
  status?: string;
  completionLevel?: number;
  completionLabel?: string;
  compact?: boolean;
  isSelected?: boolean;
  dragDisabledHint?: string;
  className?: string;
  style?: CSSProperties;
};

export function CalendarBlockCardContent({
  title,
  categoryName,
  color,
  timeLabel,
  locale,
  status,
  completionLevel,
  completionLabel,
  compact = false,
  isSelected = false,
  dragDisabledHint,
  className,
  style,
}: Props) {
  const hintSuffix = dragDisabledHint ? ` · ${dragDisabledHint}` : "";
  const showStatus = !compact && status;
  const showCompletion =
    showStatus && status === "partial" && completionLevel !== undefined;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 overflow-hidden rounded-md border bg-card text-left text-card-foreground shadow-sm transition-shadow",
        isSelected
          ? "border-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
          : "border-border hover:shadow-md",
        className,
      )}
      style={style}
      title={`${title} · ${categoryName} · ${timeLabel}${hintSuffix}`}
    >
      <span
        className="w-1 shrink-0 rounded-l-md"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 px-1.5 py-0.5">
        <p
          className={cn(
            "truncate font-medium leading-tight",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          {title}
        </p>
        {!compact ? (
          <p className="truncate text-[10px] leading-tight text-muted-foreground">
            {timeLabel}
          </p>
        ) : null}
        {showStatus ? (
          <div className="mt-0.5 flex flex-wrap gap-0.5">
            <Badge
              variant="secondary"
              className="h-4 px-1 text-[9px] font-normal"
            >
              {getStatusLabel(status, locale)}
            </Badge>
            {showCompletion && completionLabel ? (
              <Badge
                variant="outline"
                className="h-4 px-1 text-[9px] font-normal tabular-nums"
              >
                {completionLabel}: {completionLevel}%
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

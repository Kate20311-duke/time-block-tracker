import { EmptyState } from "@/components/empty-state";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  labels: Pick<
    Dictionary["timeBlocks"],
    "empty" | "emptyHint" | "goToCalendar" | "goToFocusStopwatch"
  >;
};

export function TimeBlockEmptyState({ labels }: Props) {
  return (
    <EmptyState
      title={labels.empty}
      description={labels.emptyHint}
      actions={[
        { label: labels.goToCalendar, href: "/calendar" },
        {
          label: labels.goToFocusStopwatch,
          href: "/focus?mode=stopwatch",
          variant: "outline",
        },
      ]}
    />
  );
}

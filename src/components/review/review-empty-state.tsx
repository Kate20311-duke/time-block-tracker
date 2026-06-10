import { EmptyState } from "@/components/empty-state";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  title: string;
  description: string;
  labels: Pick<
    Dictionary["review"],
    "goToCalendar" | "goToFocusStopwatch"
  >;
};

export function ReviewEmptyState({ title, description, labels }: Props) {
  return (
    <EmptyState
      title={title}
      description={description}
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

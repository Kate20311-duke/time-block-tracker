import { EmptyState } from "@/components/empty-state";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  labels: Pick<
    Dictionary["assistant"],
    "emptyTitle" | "emptyDescription" | "goRecordTimeBlocks"
  >;
};

export function AssistantEmptyState({ labels }: Props) {
  return (
    <EmptyState
      title={labels.emptyTitle}
      description={labels.emptyDescription}
      actions={[
        { label: labels.goRecordTimeBlocks, href: "/calendar" },
      ]}
    />
  );
}

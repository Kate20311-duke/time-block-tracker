import { EmptyState } from "@/components/empty-state";

type Props = {
  labels: {
    empty: string;
    emptyHint: string;
    goCreateCategory: string;
  };
};

export function GoalEmptyState({ labels }: Props) {
  return (
    <EmptyState
      title={labels.empty}
      description={labels.emptyHint}
      actions={[
        { label: labels.goCreateCategory, href: "/categories", variant: "outline" },
      ]}
    />
  );
}

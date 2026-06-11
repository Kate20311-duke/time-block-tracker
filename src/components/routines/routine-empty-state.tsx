import { EmptyState } from "@/components/empty-state";

type Props = {
  labels: {
    empty: string;
    emptyHint: string;
  };
};

export function RoutineEmptyState({ labels }: Props) {
  return <EmptyState title={labels.empty} description={labels.emptyHint} />;
}

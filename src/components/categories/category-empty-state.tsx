import { EmptyState } from "@/components/empty-state";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  labels: Pick<Dictionary["categories"], "empty" | "emptyHint">;
};

export function CategoryEmptyState({ labels }: Props) {
  return (
    <EmptyState title={labels.empty} description={labels.emptyHint} />
  );
}

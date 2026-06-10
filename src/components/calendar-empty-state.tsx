import { EmptyState } from "@/components/empty-state";

type Props = {
  title: string;
  description: string;
};

export function CalendarEmptyState({ title, description }: Props) {
  return <EmptyState title={title} description={description} />;
}

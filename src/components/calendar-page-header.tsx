import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  labels: Pick<Dictionary["calendar"], "title" | "pageDescription">;
};

export function CalendarPageHeader({ labels }: Props) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{labels.title}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        {labels.pageDescription}
      </p>
    </div>
  );
}

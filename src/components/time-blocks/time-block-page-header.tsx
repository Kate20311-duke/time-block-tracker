import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  labels: Pick<Dictionary["timeBlocks"], "title" | "pageDescription">;
};

export function TimeBlockPageHeader({ labels }: Props) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{labels.title}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        {labels.pageDescription}
      </p>
    </div>
  );
}

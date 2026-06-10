import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  label: Dictionary["review"]["scopeNote"];
};

export function ReviewScopeNote({ label }: Props) {
  return (
    <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      {label}
    </p>
  );
}

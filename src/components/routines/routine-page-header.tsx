type Props = {
  labels: {
    title: string;
    pageDescription: string;
  };
};

export function RoutinePageHeader({ labels }: Props) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{labels.title}</h1>
      <p className="text-sm text-muted-foreground">{labels.pageDescription}</p>
    </header>
  );
}

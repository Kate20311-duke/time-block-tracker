import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export default async function GoalDetailNotFound() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">{t.goals.detail.notFound}</h1>
      <p className="text-sm text-muted-foreground">{t.goals.detail.notFoundHint}</p>
      <Button asChild>
        <Link href="/goals">{t.goals.detail.backToGoals}</Link>
      </Button>
    </div>
  );
}

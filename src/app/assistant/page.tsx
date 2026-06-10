import { AssistantPageView } from "@/components/assistant/assistant-page-view";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  await requireUser();
  const timeZone = await getUserCalendarTimeZone();

  return (
    <AssistantPageView
      labels={t.assistant}
      locale={locale}
      timeZone={timeZone}
    />
  );
}

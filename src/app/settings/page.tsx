import { DataExportSection } from "@/components/settings/data-export-section";
import { IcsImportPreviewSection } from "@/components/settings/ics-import-preview-section";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { categoriesForUser } from "@/lib/db/scoped";
import { defaultExportMonthRange } from "@/lib/export/time-block-query";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const user = await requireUser();

  const [categories, userTimeZone] = await Promise.all([
    categoriesForUser(user.id, {
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    getUserCalendarTimeZone(),
  ]);
  const { fromParam, toParam } = defaultExportMonthRange(userTimeZone);

  return (
    <div className="space-y-8">
      <SettingsPageHeader labels={t.settings} />
      <DataExportSection
        labels={t.settings.export}
        initialFrom={fromParam}
        initialTo={toParam}
      />
      <IcsImportPreviewSection
        labels={t.settings.import}
        locale={locale}
        timeZone={userTimeZone}
        categories={categories}
      />
    </div>
  );
}

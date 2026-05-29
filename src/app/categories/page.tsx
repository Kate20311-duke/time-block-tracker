import { CategoryRow } from "@/components/category-row";
import { SubmitButton } from "@/components/submit-button";
import { createCategory } from "@/lib/actions/categories";
import { formatMessage, getDictionary } from "@/lib/i18n";
import { categoriesForUser } from "@/lib/db/scoped";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { success, error } = await searchParams;
  const user = await requireUser();

  const categories = await categoriesForUser(user.id, {
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { timeBlocks: true, focusSessions: true } },
    },
  });

  const successMessage =
    success === "created"
      ? t.categories.success.created
      : success === "updated"
        ? t.categories.success.updated
        : success === "deleted"
          ? t.categories.success.deleted
          : null;

  const errorMessage =
    error === "has-records"
      ? t.categories.errors.hasRecords
      : error === "has-time-blocks"
        ? t.categories.errors.hasTimeBlocks
        : error === "delete_failed"
        ? t.categories.errors.deleteFailed
        : error === "empty_name"
          ? t.categories.errors.emptyName
          : null;

  const createFormKey = success === "created" ? "created" : "default";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t.categories.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t.categories.subtitle}</p>
      </div>

      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">{t.categories.newCategory}</h2>
        <form
          key={createFormKey}
          action={createCategory}
          className="grid gap-4 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.categories.name}</span>
            <input
              name="name"
              required
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder={t.categories.namePlaceholder}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.categories.color}</span>
            <input
              name="color"
              type="color"
              defaultValue="#3b82f6"
              className="h-10 w-14 cursor-pointer rounded border border-zinc-300"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">{t.categories.descriptionOptional}</span>
            <textarea
              name="description"
              rows={2}
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder={t.categories.descriptionPlaceholder}
            />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton
              label={t.common.create}
              pendingLabel={t.common.submitting}
            />
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t.categories.allCategories}</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-500">{t.categories.empty}</p>
        ) : (
          <ul className="space-y-4">
            {categories.map((category) => {
              const timeBlockCount = category._count.timeBlocks;
              const focusSessionCount = category._count.focusSessions;
              const hasRecords = timeBlockCount > 0 || focusSessionCount > 0;

              return (
                <CategoryRow
                  key={category.id}
                  category={{
                    id: category.id,
                    name: category.name,
                    color: category.color,
                    description: category.description,
                    timeBlockCount,
                    focusSessionCount,
                  }}
                  labels={{
                    name: t.categories.name,
                    color: t.categories.color,
                    descriptionOptional: t.categories.descriptionOptional,
                    timeBlockCountFormatted: formatMessage(
                      t.categories.timeBlockCount,
                      { count: timeBlockCount },
                    ),
                    focusSessionCountFormatted: formatMessage(
                      t.categories.focusSessionCount,
                      { count: focusSessionCount },
                    ),
                    cannotDeleteFormatted: hasRecords
                      ? t.categories.cannotDeleteRecords
                      : null,
                    confirmDelete: formatMessage(t.categories.confirmDelete, {
                      name: category.name,
                    }),
                    edit: t.common.edit,
                    save: t.common.save,
                    cancel: t.common.cancel,
                    delete: t.common.delete,
                    submitting: t.common.submitting,
                  }}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

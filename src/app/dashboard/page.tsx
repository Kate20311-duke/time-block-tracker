import { formatMessage, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { durationMinutes, formatHoursFromMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const [categoryCount, timeBlocks, categories] = await Promise.all([
    prisma.category.count(),
    prisma.timeBlock.findMany({
      select: { startTime: true, endTime: true, status: true },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        timeBlocks: {
          select: { startTime: true, endTime: true },
        },
      },
    }),
  ]);

  const timeBlockCount = timeBlocks.length;
  const totalMinutes = timeBlocks.reduce(
    (sum, block) => sum + durationMinutes(block.startTime, block.endTime),
    0,
  );
  const completedCount = timeBlocks.filter(
    (b) => b.status === "completed",
  ).length;
  const plannedCount = timeBlocks.filter((b) => b.status === "planned").length;

  const categorySummaries = categories.map((category) => {
    const minutes = category.timeBlocks.reduce(
      (sum, block) => sum + durationMinutes(block.startTime, block.endTime),
      0,
    );
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      blockCount: category.timeBlocks.length,
      totalMinutes: minutes,
    };
  });

  const stats = [
    { label: t.dashboard.totalCategories, value: String(categoryCount) },
    { label: t.dashboard.totalTimeBlocks, value: String(timeBlockCount) },
    {
      label: t.dashboard.totalRecordedTime,
      value: `${formatHoursFromMinutes(totalMinutes)} ${t.dashboard.hoursUnit}`,
    },
    { label: t.dashboard.completedRecords, value: String(completedCount) },
    { label: t.dashboard.plannedRecords, value: String(plannedCount) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t.dashboard.subtitle}</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t.dashboard.overview}</h2>
        {timeBlockCount === 0 && categoryCount === 0 ? (
          <p className="mb-4 text-sm text-zinc-500">{t.dashboard.noData}</p>
        ) : null}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <li
              key={stat.label}
              className="rounded-lg border border-zinc-200 bg-white p-5"
            >
              <p className="text-sm text-zinc-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {stat.value}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t.dashboard.byCategory}</h2>
        {categorySummaries.length === 0 ? (
          <p className="text-sm text-zinc-500">{t.dashboard.emptyCategories}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {categorySummaries.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  <span className="font-medium text-zinc-900">{row.name}</span>
                </div>
                <div className="text-sm text-zinc-600">
                  <span className="font-medium text-zinc-800">
                    {formatHoursFromMinutes(row.totalMinutes)}{" "}
                    {t.dashboard.hoursUnit}
                  </span>
                  <span className="mx-2 text-zinc-300">·</span>
                  <span>
                    {formatMessage(t.dashboard.blockCount, {
                      count: row.blockCount,
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

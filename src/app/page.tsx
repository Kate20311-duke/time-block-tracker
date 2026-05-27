import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const cards = [
    { href: "/categories" as const, ...t.home.cards.categories },
    { href: "/time-blocks" as const, ...t.home.cards.timeBlocks },
    { href: "/calendar" as const, ...t.home.cards.calendar },
    { href: "/dashboard" as const, ...t.home.cards.dashboard },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">{t.home.title}</h1>
        <p className="mt-2 max-w-2xl text-zinc-600">{t.home.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/time-blocks"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t.home.startTracking}
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {t.home.viewDashboard}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t.home.quickLinks}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block h-full rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow"
              >
                <span className="text-base font-semibold text-zinc-900">
                  {item.title}
                </span>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {item.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

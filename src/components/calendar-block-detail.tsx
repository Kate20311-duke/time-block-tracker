import Link from "next/link";
import { getStatusLabel, type Dictionary, type Locale } from "@/lib/i18n";
import { durationMinutes, formatDateTime } from "@/lib/time";

export type CalendarBlockDetailData = {
  id: string;
  title: string;
  note: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  completionLevel: number;
  category: { name: string; color: string };
};

type Props = {
  block: CalendarBlockDetailData;
  locale: Locale;
  t: Dictionary;
  closeHref: string;
};

export function CalendarBlockDetail({
  block,
  locale,
  t,
  closeHref,
}: Props) {
  const minutes = durationMinutes(block.startTime, block.endTime);

  return (
    <section
      aria-label={t.calendar.detail.panelAria}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{block.title}</h2>
        <Link
          href={closeHref}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {t.calendar.detail.close}
        </Link>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500">{t.timeBlocks.category}</dt>
          <dd className="mt-1 flex items-center gap-2 text-zinc-900">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: block.category.color }}
              aria-hidden
            />
            {block.category.name}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">{t.timeBlocks.status}</dt>
          <dd className="mt-1 text-zinc-900">
            {getStatusLabel(block.status, locale)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">{t.timeBlocks.startTime}</dt>
          <dd className="mt-1 text-zinc-900">
            {formatDateTime(block.startTime, locale)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">{t.timeBlocks.endTime}</dt>
          <dd className="mt-1 text-zinc-900">
            {formatDateTime(block.endTime, locale)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">{t.timeBlocks.duration}</dt>
          <dd className="mt-1 text-zinc-900">
            {minutes} {t.timeBlocks.minutesUnit}
          </dd>
        </div>
        {block.note ? (
          <div className="sm:col-span-2">
            <dt className="font-medium text-zinc-500">{t.timeBlocks.note}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-900">
              {block.note}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-4 text-sm text-zinc-600">
        <Link
          href="/time-blocks"
          className="font-medium text-zinc-900 underline hover:text-zinc-700"
        >
          {t.calendar.detail.editOnTimeBlocks}
        </Link>
      </p>
    </section>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CategoryPieDatum = {
  name: string;
  minutes: number;
  color: string;
};

export type DailyBarDatum = {
  dayLabel: string;
  hours: number;
};

export type StatusBarDatum = {
  statusLabel: string;
  count: number;
  color: string;
};

export function DashboardCharts(props: {
  categoryPie: CategoryPieDatum[];
  dailyBars: DailyBarDatum[];
  statusBars: StatusBarDatum[];
  emptyLabel: string;
  categoryTitle: string;
  dailyTitle: string;
  statusTitle: string;
}) {
  const { categoryPie, dailyBars, statusBars } = props;

  const hasCategory = categoryPie.some((d) => d.minutes > 0);
  const hasDaily = dailyBars.some((d) => d.hours > 0);
  const hasStatus = statusBars.some((d) => d.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-zinc-900">
            {props.categoryTitle}
          </h3>
          <div className="mt-3 h-64">
            {hasCategory ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPie}
                    dataKey="minutes"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                  >
                    {categoryPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} min`, ""]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500">{props.emptyLabel}</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-900">
            {props.dailyTitle}
          </h3>
          <div className="mt-3 h-64">
            {hasDaily ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBars} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value} h`, ""]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500">{props.emptyLabel}</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-900">{props.statusTitle}</h3>
        <div className="mt-3 h-56">
          {hasStatus ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBars} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="statusLabel" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusBars.map((s) => (
                    <Cell key={s.statusLabel} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-500">{props.emptyLabel}</p>
          )}
        </div>
      </section>
    </div>
  );
}


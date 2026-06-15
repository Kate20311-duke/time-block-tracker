import type { CategoryTimeMinutes } from "@/lib/stats";

export type ReviewCategoryRow = CategoryTimeMinutes & {
  percent: number;
};

export function mapCategoryBreakdownRows(
  rows: CategoryTimeMinutes[],
  totalMinutes: number,
): ReviewCategoryRow[] {
  return rows.map((row) => ({
    ...row,
    percent:
      totalMinutes > 0
        ? Math.round((row.totalMinutes / totalMinutes) * 100)
        : 0,
  }));
}

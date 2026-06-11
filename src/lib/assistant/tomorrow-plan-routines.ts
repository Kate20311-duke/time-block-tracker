import { buildRoutineOccurrence } from "@/lib/routines/routine-generate";
import type { RoutineForGenerate } from "@/lib/routines/routine-generate-types";
import type { TomorrowRoutineBlock } from "@/lib/assistant/tomorrow-plan-types";

export type RoutineRecordForTomorrowPlan = {
  id: string;
  title: string;
  categoryId: string | null;
  category: { name: string } | null;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
};

export function routineRecordToForGenerate(
  routine: RoutineRecordForTomorrowPlan,
): RoutineForGenerate {
  return {
    id: routine.id,
    title: routine.title,
    categoryId: routine.categoryId,
    startTime: routine.startTime,
    endTime: routine.endTime,
    daysOfWeek: routine.daysOfWeek,
    startDate: routine.startDate,
    endDate: routine.endDate,
    notes: null,
    isActive: routine.isActive,
  };
}

export function buildTomorrowRoutineBlocks(params: {
  date: string;
  timeZone: string;
  routines: RoutineRecordForTomorrowPlan[];
}): TomorrowRoutineBlock[] {
  const blocks: TomorrowRoutineBlock[] = [];

  for (const routine of params.routines) {
    if (!routine.isActive) {
      continue;
    }

    const occurrence = buildRoutineOccurrence(
      routineRecordToForGenerate(routine),
      params.date,
      params.timeZone,
    );
    if (!occurrence) {
      continue;
    }

    blocks.push({
      routineId: routine.id,
      title: routine.title,
      categoryId: routine.categoryId,
      categoryName: routine.category?.name ?? null,
      startTime: occurrence.startTime.toISOString(),
      endTime: occurrence.endTime.toISOString(),
      daysOfWeek: routine.daysOfWeek,
    });
  }

  return blocks.sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime() ||
      a.title.localeCompare(b.title),
  );
}

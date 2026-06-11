export const MAX_GENERATE_DAYS = 31;
export const MAX_ROUTINE_IDS = 50;

export type RoutineGenerateSkipReason =
  | "duplicate"
  | "conflict_existing"
  | "conflict_batch"
  | "missing_category"
  | "invalid_category";

export type RoutineGenerateRangeError =
  | "invalid_date"
  | "invalid_range"
  | "range_too_long";

export type RoutineGenerateInput = {
  startDate: string;
  endDate: string;
  routineIds?: string[];
};

export type RoutineForGenerate = {
  id: string;
  title: string;
  categoryId: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  isActive: boolean;
};

export type RoutineGenerateCandidate = {
  routineId: string;
  title: string;
  categoryId: string | null;
  date: string;
  startTime: Date;
  endTime: Date;
  note: string | null;
};

export type RoutineGenerateCreatedBlock = {
  id: string;
  title: string;
  routineId: string;
  startTime: string;
  endTime: string;
};

export type RoutineGenerateSkippedBlock = {
  title: string;
  routineId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason: RoutineGenerateSkipReason;
};

export type RoutineGenerateResult = {
  createdCount: number;
  skippedCount: number;
  createdBlocks: RoutineGenerateCreatedBlock[];
  skippedBlocks: RoutineGenerateSkippedBlock[];
  calendarUrl: string;
};

export type RoutineGenerateRangePreset =
  | "next7"
  | "thisWeek"
  | "nextWeek"
  | "custom";

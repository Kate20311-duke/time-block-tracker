export type TomorrowPlanApplyInputBlock = {
  title: string;
  categoryId: string | null;
  categoryName?: string | null;
  startTime: string;
  endTime: string;
};

export type TomorrowPlanSkipReason =
  | "invalid_fields"
  | "not_tomorrow"
  | "invalid_duration"
  | "invalid_category"
  | "conflict_existing"
  | "conflict_batch"
  | "conflict_routine"
  | "duplicate";

export type TomorrowPlanCreatedBlock = {
  id: string;
  title: string;
  categoryId: string | null;
  startTime: string;
  endTime: string;
};

export type TomorrowPlanSkippedBlock = {
  title: string;
  startTime?: string;
  endTime?: string;
  reason: TomorrowPlanSkipReason;
};

export type TomorrowPlanApplyResult = {
  createdCount: number;
  skippedCount: number;
  createdBlocks: TomorrowPlanCreatedBlock[];
  skippedBlocks: TomorrowPlanSkippedBlock[];
  calendarUrl: string;
};

export const MAX_APPLY_BLOCKS = 10;
export const APPLY_TITLE_MAX_LENGTH = 100;
export const APPLY_MIN_MINUTES = 5;
export const APPLY_MAX_MINUTES = 240;

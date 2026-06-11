import type { TimeReviewSource } from "@/lib/assistant/weekly-review-types";

export type ExistingTomorrowBlock = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  startTime: string;
  endTime: string;
};

export type UserCategoryForPlan = {
  id: string;
  name: string;
  color?: string | null;
  recentMinutes?: number;
};

export type TomorrowRoutineBlock = {
  routineId: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
};

export type TomorrowPlanContext = {
  date: string;
  timezone: string;
  existingBlocks: ExistingTomorrowBlock[];
  routineBlocks: TomorrowRoutineBlock[];
  categories: UserCategoryForPlan[];
  recentCategoryUsage: {
    categoryId: string;
    name: string;
    minutes: number;
  }[];
};

export type TomorrowPlanBlockDraft = {
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  startTime: string;
  endTime: string;
  reason: string;
  confidence: "low" | "medium" | "high";
};

export type TomorrowPlanResult = {
  date: string;
  summary: string;
  assumptions: string[];
  suggestedBlocks: TomorrowPlanBlockDraft[];
  warnings: string[];
};

export type TomorrowPlanResponse = {
  date: string;
  existingBlocks: ExistingTomorrowBlock[];
  routineBlocks: TomorrowRoutineBlock[];
  plan: TomorrowPlanResult;
  source: TimeReviewSource;
};

export const USER_GOAL_MIN_LENGTH = 3;
export const USER_GOAL_MAX_LENGTH = 500;
export const PLAN_BLOCK_MIN_MINUTES = 25;
export const PLAN_BLOCK_MAX_MINUTES = 180;
export const PLAN_BLOCK_MAX_COUNT = 6;
export const PLAN_BLOCK_MIN_COUNT = 2;

export type AssistantCategoryBreakdown = {
  categoryId: string;
  name: string;
  minutes: number;
  percentage: number;
};

export type AssistantDailyTotal = {
  date: string;
  minutes: number;
};

export type AssistantFocusSummary = {
  totalCount: number;
  completedCount: number;
  totalMinutes: number;
};

export type TimeReviewDataQualityLevel = "empty" | "low" | "medium" | "good";

export type TimeReviewDataQuality = {
  level: TimeReviewDataQualityLevel;
  recordedDays: number;
  rangeDays: number;
  note: string;
};

export type TimeReviewSummary = {
  range: {
    start: string;
    end: string;
    label?: string;
  };
  totalRecordedMinutes: number;
  activeCategories: {
    categoryId: string;
    name: string;
  }[];
  categoryBreakdown: AssistantCategoryBreakdown[];
  dailyTotals: AssistantDailyTotal[];
  completionRate: number | null;
  focusSessions: AssistantFocusSummary;
  dataScopeNote: string;
  dataQuality: TimeReviewDataQuality;
};

/** @deprecated Use TimeReviewSummary */
export type WeeklyReviewSummary = TimeReviewSummary;

export type TimeReviewResult = {
  dataScopeNote: string;
  summary: string;
  findings: string[];
  potentialIssues: string[];
  positives: string[];
  suggestions: string[];
  actionItems: {
    title: string;
    description: string;
  }[];
};

/** @deprecated Use TimeReviewResult */
export type WeeklyReviewResult = TimeReviewResult;

export type TimeReviewSource = "deepseek" | "mock" | "fallback";

/** @deprecated Use TimeReviewSource */
export type WeeklyReviewSource = TimeReviewSource;

export type TimeReviewResponse = {
  summary: TimeReviewSummary;
  review: TimeReviewResult;
  source: TimeReviewSource;
};

/** @deprecated Use TimeReviewResponse */
export type WeeklyReviewResponse = TimeReviewResponse;

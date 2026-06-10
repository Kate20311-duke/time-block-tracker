import type { WeeklyReviewResult } from "@/lib/assistant/weekly-review-types";

export class WeeklyReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeeklyReviewValidationError";
  }
}

const DEFAULT_ACTION_ITEMS: WeeklyReviewResult["actionItems"] = [
  {
    title: "补记当天最重要的时间块",
    description: "每天结束前，补记当天最重要的 1 个时间块。",
  },
  {
    title: "为高频分类设定下周目标",
    description: "给本周使用最多的分类设置一个可衡量的下周目标。",
  },
  {
    title: "关注记录较少的日子",
    description: "找出本周记录最少的一天，看看是否需要设置提醒。",
  },
];

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => asNonEmptyString(item))
    .filter((item): item is string => item !== null);
  return items.length > 0 ? items : fallback;
}

function normalizeActionItems(
  value: unknown,
): WeeklyReviewResult["actionItems"] {
  const items: WeeklyReviewResult["actionItems"] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const title = asNonEmptyString(record.title);
      const description = asNonEmptyString(record.description);
      if (title && description) {
        items.push({ title, description });
      }
    }
  }

  if (items.length === 0) {
    throw new WeeklyReviewValidationError("actionItems is empty or invalid");
  }

  while (items.length < 3) {
    const fallback = DEFAULT_ACTION_ITEMS[items.length];
    if (fallback) {
      items.push(fallback);
    } else {
      items.push({
        title: "继续保持记录习惯",
        description: "为下周设定一个简单、可执行的时间记录目标。",
      });
    }
  }

  return items.slice(0, 3);
}

export function parseWeeklyReviewJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new WeeklyReviewValidationError("Response is not valid JSON");
  }
}

/**
 * Validate and normalize model output into WeeklyReviewResult.
 * Throws WeeklyReviewValidationError when the structure is unusable.
 */
export function validateWeeklyReviewResult(
  value: unknown,
  fallbackDataScopeNote: string,
): WeeklyReviewResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WeeklyReviewValidationError("Root value is not an object");
  }

  const record = value as Record<string, unknown>;

  const summary = asNonEmptyString(record.summary);
  if (!summary) {
    throw new WeeklyReviewValidationError("summary is missing or empty");
  }

  const dataScopeNote =
    asNonEmptyString(record.dataScopeNote) ?? fallbackDataScopeNote;

  return {
    dataScopeNote,
    summary,
    findings: asStringArray(record.findings),
    potentialIssues: asStringArray(record.potentialIssues),
    positives: asStringArray(record.positives),
    suggestions: asStringArray(record.suggestions),
    actionItems: normalizeActionItems(record.actionItems),
  };
}

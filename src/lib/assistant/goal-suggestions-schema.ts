import {
  dedupeGoalSuggestions,
  ensureUniqueSuggestionIds,
} from "@/lib/assistant/goal-suggestions-utils";
import {
  GOAL_SUGGESTION_CONFIDENCE_LEVELS,
  GOAL_SUGGESTION_DESCRIPTION_MAX_LENGTH,
  GOAL_SUGGESTION_REASON_MAX_LENGTH,
  GOAL_SUGGESTION_TITLE_MAX_LENGTH,
  GOAL_SUGGESTIONS_MAX_COUNT,
  GOAL_SUGGESTIONS_MIN_COUNT,
  type GoalSuggestionDraft,
  type GoalSuggestionsContext,
} from "@/lib/assistant/goal-suggestions-types";
import { GOAL_METRICS, GOAL_PERIODS, GOAL_TYPES } from "@/lib/constants";
import { isValidGoalMetric, isGoalCountMetric } from "@/lib/goals-metric-display";
import { isValidGoalTypePeriodCombo } from "@/lib/goals";

export class GoalSuggestionsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalSuggestionsValidationError";
  }
}

function asNonEmptyString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function parseConfidence(value: unknown): GoalSuggestionDraft["confidence"] {
  if (
    typeof value === "string" &&
    (GOAL_SUGGESTION_CONFIDENCE_LEVELS as readonly string[]).includes(value)
  ) {
    return value as GoalSuggestionDraft["confidence"];
  }
  return "medium";
}

function parseMetric(value: unknown): GoalSuggestionDraft["metric"] | null {
  if (typeof value !== "string" || !isValidGoalMetric(value)) return null;
  return value;
}

function parseGoalType(value: unknown): GoalSuggestionDraft["goalType"] | null {
  if (typeof value !== "string") return null;
  if (!(GOAL_TYPES as readonly string[]).includes(value)) return null;
  return value as GoalSuggestionDraft["goalType"];
}

function parsePeriod(value: unknown): GoalSuggestionDraft["period"] | null {
  if (typeof value !== "string") return null;
  if (!(GOAL_PERIODS as readonly string[]).includes(value)) return null;
  return value as GoalSuggestionDraft["period"];
}

function parseTargetValue(
  value: unknown,
  metric: GoalSuggestionDraft["metric"],
): number | null {
  let numeric: number;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string" && value.trim()) {
    numeric = Number(value.trim());
  } else {
    return null;
  }

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  if (isGoalCountMetric(metric) && !Number.isInteger(numeric)) {
    return null;
  }
  return numeric;
}

function parseCategoryId(
  value: unknown,
  allowedCategoryIds: ReadonlySet<string>,
): string | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (!trimmed) return null;
  return allowedCategoryIds.has(trimmed) ? trimmed : "invalid";
}

function parseSuggestionItem(
  value: unknown,
  allowedCategoryIds: ReadonlySet<string>,
  index: number,
): GoalSuggestionDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const metric = parseMetric(record.metric);
  const goalType = parseGoalType(record.goalType);
  const period = parsePeriod(record.period);
  if (!metric || !goalType || !period) return null;
  if (!isValidGoalTypePeriodCombo(goalType, period)) return null;
  if (!(GOAL_METRICS as readonly string[]).includes(metric)) return null;

  const targetValue = parseTargetValue(record.targetValue, metric);
  if (targetValue === null) return null;

  const title = asNonEmptyString(record.title, GOAL_SUGGESTION_TITLE_MAX_LENGTH);
  const description = asNonEmptyString(
    record.description,
    GOAL_SUGGESTION_DESCRIPTION_MAX_LENGTH,
  );
  const reason = asNonEmptyString(record.reason, GOAL_SUGGESTION_REASON_MAX_LENGTH);
  if (!title || !description || !reason) return null;

  const rawId = asNonEmptyString(record.id, 64);
  const id = rawId ?? `suggestion-${index + 1}`;

  const categoryId = parseCategoryId(record.categoryId, allowedCategoryIds);
  if (categoryId === "invalid") return null;

  return {
    id,
    title,
    description,
    reason,
    metric,
    goalType,
    period,
    targetValue,
    categoryId,
    confidence: parseConfidence(record.confidence),
  };
}

export function parseGoalSuggestionsJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new GoalSuggestionsValidationError("Response is not valid JSON");
  }
}

export function validateGoalSuggestionsResult(
  value: unknown,
  context: GoalSuggestionsContext,
): GoalSuggestionDraft[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GoalSuggestionsValidationError("Root value is not an object");
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.suggestions)) {
    throw new GoalSuggestionsValidationError("suggestions must be an array");
  }

  const allowedCategoryIds = new Set(context.categories.map((category) => category.id));
  const parsed: GoalSuggestionDraft[] = [];

  for (let index = 0; index < record.suggestions.length; index++) {
    const item = parseSuggestionItem(
      record.suggestions[index],
      allowedCategoryIds,
      index,
    );
    if (item) parsed.push(item);
  }

  return finalizeGoalSuggestions(parsed, context);
}

/** Dedupe, drop active-goal overlaps, enforce count cap, and require minimum items. */
export function finalizeGoalSuggestions(
  suggestions: GoalSuggestionDraft[],
  context: GoalSuggestionsContext,
): GoalSuggestionDraft[] {
  const finalized = ensureUniqueSuggestionIds(
    dedupeGoalSuggestions(suggestions, context),
  ).slice(0, GOAL_SUGGESTIONS_MAX_COUNT);

  if (finalized.length < GOAL_SUGGESTIONS_MIN_COUNT) {
    throw new GoalSuggestionsValidationError(
      `Expected at least ${GOAL_SUGGESTIONS_MIN_COUNT} valid suggestions`,
    );
  }

  return finalized;
}

/** Exported for unit tests — validates a single suggestion object. */
export function validateGoalSuggestionItem(
  value: unknown,
  allowedCategoryIds: ReadonlySet<string> = new Set(),
  index = 0,
): GoalSuggestionDraft | null {
  return parseSuggestionItem(value, allowedCategoryIds, index);
}

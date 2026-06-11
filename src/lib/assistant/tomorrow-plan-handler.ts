import "server-only";

import { getTomorrowPlanContext } from "@/lib/assistant/tomorrow-plan-context";
import { generateTomorrowPlan } from "@/lib/assistant/tomorrow-plan-generate";
import type { TomorrowPlanResponse } from "@/lib/assistant/tomorrow-plan-types";
import {
  USER_GOAL_MAX_LENGTH,
  USER_GOAL_MIN_LENGTH,
} from "@/lib/assistant/tomorrow-plan-types";
import type { Locale } from "@/lib/i18n/types";

export type TomorrowPlanHandlerError =
  | { code: "invalid_goal" }
  | { code: "internal" };

export function normalizeUserGoal(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < USER_GOAL_MIN_LENGTH) return null;
  if (trimmed.length > USER_GOAL_MAX_LENGTH) return null;
  return trimmed;
}

export async function handleTomorrowPlanRequest(params: {
  userId: string;
  timeZone: string;
  locale: Locale;
  userGoal: string;
}): Promise<
  | { ok: true; data: TomorrowPlanResponse }
  | { ok: false; error: TomorrowPlanHandlerError }
> {
  const userGoal = normalizeUserGoal(params.userGoal);
  if (!userGoal) {
    return { ok: false, error: { code: "invalid_goal" } };
  }

  try {
    const context = await getTomorrowPlanContext(
      params.userId,
      params.timeZone,
    );
    const { plan, source } = await generateTomorrowPlan({
      userGoal,
      context,
      locale: params.locale,
    });

    return {
      ok: true,
      data: {
        date: context.date,
        existingBlocks: context.existingBlocks,
        routineBlocks: context.routineBlocks,
        plan,
        source,
      },
    };
  } catch {
    return { ok: false, error: { code: "internal" } };
  }
}

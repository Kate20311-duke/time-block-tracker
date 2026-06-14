import { GOAL_METRICS } from "@/lib/constants";
import { goalPrefillToFormDefaults } from "@/lib/goal-prefill";
import {
  goalTargetToFormInput,
  isGoalCountMetric,
} from "@/lib/goals-metric-display";
import { isValidGoalTypePeriodCombo } from "@/lib/goals";

export const GOAL_TEMPLATE_GROUPS = ["time", "completion", "focus"] as const;

export type GoalTemplateGroup = (typeof GOAL_TEMPLATE_GROUPS)[number];

export const GOAL_TEMPLATES = [
  {
    id: "dailyStudy2h",
    group: "time",
    metric: "time_block_minutes",
    goalType: "recurring",
    period: "daily",
    targetMinutes: 120,
  },
  {
    id: "weeklyWork30h",
    group: "time",
    metric: "time_block_minutes",
    goalType: "recurring",
    period: "weekly",
    targetMinutes: 1800,
  },
  {
    id: "weeklyExercise3h",
    group: "time",
    metric: "time_block_minutes",
    goalType: "recurring",
    period: "weekly",
    targetMinutes: 180,
  },
  {
    id: "dailyRest1h",
    group: "time",
    metric: "time_block_minutes",
    goalType: "recurring",
    period: "daily",
    targetMinutes: 60,
  },
  {
    id: "dailyComplete3Blocks",
    group: "completion",
    metric: "completed_blocks_count",
    goalType: "recurring",
    period: "daily",
    targetMinutes: 3,
  },
  {
    id: "weeklyComplete15Blocks",
    group: "completion",
    metric: "completed_blocks_count",
    goalType: "recurring",
    period: "weekly",
    targetMinutes: 15,
  },
  {
    id: "dailyFocus60m",
    group: "focus",
    metric: "focus_minutes",
    goalType: "recurring",
    period: "daily",
    targetMinutes: 60,
  },
  {
    id: "weeklyFocus10Sessions",
    group: "focus",
    metric: "focus_sessions_count",
    goalType: "recurring",
    period: "weekly",
    targetMinutes: 10,
  },
] as const;

export type GoalTemplateDefinition = (typeof GOAL_TEMPLATES)[number];
export type GoalTemplateId = GoalTemplateDefinition["id"];

export function isValidGoalTemplateGroup(group: string): group is GoalTemplateGroup {
  return (GOAL_TEMPLATE_GROUPS as readonly string[]).includes(group);
}

export function getGoalTemplateById(id: GoalTemplateId): GoalTemplateDefinition | undefined {
  return GOAL_TEMPLATES.find((template) => template.id === id);
}

export function validateGoalTemplate(template: GoalTemplateDefinition): boolean {
  if (!(GOAL_METRICS as readonly string[]).includes(template.metric)) return false;
  if (!isValidGoalTemplateGroup(template.group)) return false;
  if (template.goalType !== "recurring") return false;
  if (!isValidGoalTypePeriodCombo(template.goalType, template.period)) return false;
  if (!Number.isFinite(template.targetMinutes) || template.targetMinutes <= 0) {
    return false;
  }
  if (isGoalCountMetric(template.metric) && !Number.isInteger(template.targetMinutes)) {
    return false;
  }
  return true;
}

export function assertAllGoalTemplatesValid(): void {
  const ids = new Set<string>();
  for (const template of GOAL_TEMPLATES) {
    if (!validateGoalTemplate(template)) {
      throw new Error(`Invalid goal template: ${template.id}`);
    }
    if (ids.has(template.id)) {
      throw new Error(`Duplicate goal template id: ${template.id}`);
    }
    ids.add(template.id);
  }
}

export function groupGoalTemplates(
  templates: readonly GoalTemplateDefinition[] = GOAL_TEMPLATES,
): Array<{ group: GoalTemplateGroup; templates: GoalTemplateDefinition[] }> {
  return GOAL_TEMPLATE_GROUPS.map((group) => ({
    group,
    templates: templates.filter((template) => template.group === group),
  }));
}

export type GoalTemplateText = {
  title: string;
  description: string;
};

export function templateTargetToFormInput(template: GoalTemplateDefinition): string {
  return goalTargetToFormInput(template.metric, template.targetMinutes);
}

export type GoalTemplateFormDefaults = {
  title: string;
  description: string;
  categoryId: null;
  targetHours: string;
  startDate: string;
  endDate: string;
  goalType: "recurring";
  period: "daily" | "weekly";
};

/** Convert a template into create-form defaults (does not submit). */
export function templateToFormDefaults(
  template: GoalTemplateDefinition,
  startDate: string,
  text: GoalTemplateText,
): GoalTemplateFormDefaults {
  return goalPrefillToFormDefaults({
    title: text.title,
    description: text.description,
    categoryId: null,
    metric: template.metric,
    goalType: template.goalType,
    period: template.period,
    targetMinutes: template.targetMinutes,
    startDate,
  }) as GoalTemplateFormDefaults;
}

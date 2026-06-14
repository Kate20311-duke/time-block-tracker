import { describe, expect, it } from "vitest";
import {
  GOAL_TEMPLATES,
  GOAL_TEMPLATE_GROUPS,
  assertAllGoalTemplatesValid,
  getGoalTemplateById,
  groupGoalTemplates,
  isValidGoalTemplateGroup,
  templateTargetToFormInput,
  templateToFormDefaults,
  validateGoalTemplate,
} from "./goal-templates";
import { isGoalCountMetric, isGoalMinuteMetric } from "./goals-metric-display";

describe("goal templates", () => {
  it("has unique valid ids and groups", () => {
    assertAllGoalTemplatesValid();
    const ids = GOAL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of GOAL_TEMPLATE_GROUPS) {
      expect(isValidGoalTemplateGroup(group)).toBe(true);
    }
  });

  it("groups templates into time, completion, and focus", () => {
    const grouped = groupGoalTemplates();
    expect(grouped).toHaveLength(3);
    expect(grouped[0].group).toBe("time");
    expect(grouped[0].templates.length).toBe(4);
    expect(grouped[1].templates.every((t) => t.metric === "completed_blocks_count")).toBe(
      true,
    );
    expect(grouped[2].templates.every((t) => t.metric.startsWith("focus_"))).toBe(true);
  });

  it("exposes minute targets for minute metrics", () => {
    const template = getGoalTemplateById("dailyStudy2h");
    expect(template).toBeDefined();
    expect(isGoalMinuteMetric(template!.metric)).toBe(true);
    expect(templateTargetToFormInput(template!)).toBe("2");
  });

  it("exposes count targets for count metrics", () => {
    const template = getGoalTemplateById("dailyComplete3Blocks");
    expect(template).toBeDefined();
    expect(isGoalCountMetric(template!.metric)).toBe(true);
    expect(templateTargetToFormInput(template!)).toBe("3");
  });

  it("converts template to form defaults", () => {
    const template = getGoalTemplateById("weeklyFocus10Sessions")!;
    const defaults = templateToFormDefaults(template, "2026-06-13", {
      title: "Weekly focus",
      description: "Ten sessions",
    });
    expect(defaults.title).toBe("Weekly focus");
    expect(defaults.description).toBe("Ten sessions");
    expect(defaults.targetHours).toBe("10");
    expect(defaults.startDate).toBe("2026-06-13");
    expect(defaults.goalType).toBe("recurring");
    expect(defaults.period).toBe("weekly");
    expect(defaults.categoryId).toBeNull();
  });

  it("validates each template metric/type/period combo", () => {
    for (const template of GOAL_TEMPLATES) {
      expect(validateGoalTemplate(template)).toBe(true);
    }
  });
});

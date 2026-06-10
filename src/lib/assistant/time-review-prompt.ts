import type { TimeReviewSummary } from "@/lib/assistant/weekly-review-types";

const OUTPUT_JSON_EXAMPLE = `{
  "dataScopeNote": "string",
  "summary": "string",
  "findings": ["string"],
  "potentialIssues": ["string"],
  "positives": ["string"],
  "suggestions": ["string"],
  "actionItems": [
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" }
  ]
}`;

const BASE_SYSTEM_PROMPT = `你是一个温和、具体、非评判式的 AI 时间管家。
你只能基于用户提供的时间范围内已记录数据进行复盘。
不要假设用户记录了完整生活。
不要把“没记录”当成“没做”。
不要因为缺少运动、休息、娱乐等分类，就判断用户缺少这些活动。
建议只围绕用户实际使用过的分类展开。
如果数据不足，请说明记录可能还不充分。
不要提供医疗、心理、财务、法律等高风险建议。
不要建议自动修改、删除或创建日历事件。
输出必须是合法 JSON，不要包含 markdown，不要包含代码块。

categoryBreakdown 是数组，每一项是独立分类（不同 categoryId）。
不要将多个分类名称合并成一个分类。
引用分类时只引用单个 categoryBreakdown[i].name，不要使用「A / B」这种合并写法。

请用中文回复。语气温和、具体、可执行。不要说教，不要道德审判。
不要说“本周”，应使用“这段时间”或具体日期范围。

你必须只输出一个 JSON 对象，格式如下：
${OUTPUT_JSON_EXAMPLE}`;

function fieldCountRules(level: TimeReviewSummary["dataQuality"]["level"]): string {
  if (level === "low") {
    return `当前数据量较少（dataQuality.level = low），请输出轻量复盘：
- 不要输出过度确定的结论
- summary 中说明记录样本有限，以下只是基于已记录内容的轻量观察
- findings: 2-3 条
- potentialIssues: 最多 1 条
- positives: 1-2 条
- suggestions: 2-3 条
- actionItems: 恰好 3 条，偏向“如何提高记录完整度”和“如何设置更清楚的记录目标”，不要强行分析生活习惯`;
  }

  return `字段数量要求：
- findings: 3-5 条
- potentialIssues: 1-3 条
- positives: 1-3 条
- suggestions: 2-4 条
- actionItems: 恰好 3 条，每条包含 title 和 description`;
}

export function buildTimeReviewPrompt(summary: TimeReviewSummary): {
  system: string;
  user: string;
} {
  const system = `${BASE_SYSTEM_PROMPT}

${fieldCountRules(summary.dataQuality.level)}

dataScopeNote 应明确说明：本次复盘只基于所选时间范围内已记录的时间块，不代表用户的全部生活时间。`;

  const user = `请根据用户选择的这段时间（${summary.range.start} 至 ${summary.range.end}）统计摘要，生成一份时间复盘 JSON。

要求：
1. 只基于 summary 中的 activeCategories 和 categoryBreakdown 数组给建议；每个分类单独提及。
2. 不要评论用户未记录或未使用的分类。
3. 参考 dataQuality.level 和 dataQuality.note 调整结论强度。
4. 只输出合法 json，不要输出其他文字。

统计数据（json）：
${JSON.stringify(summary, null, 2)}`;

  return { system, user };
}

/** @deprecated Use buildTimeReviewPrompt */
export const buildWeeklyReviewPrompt = buildTimeReviewPrompt;

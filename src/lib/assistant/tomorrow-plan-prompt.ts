import type { TomorrowPlanContext } from "@/lib/assistant/tomorrow-plan-types";

const OUTPUT_JSON_EXAMPLE = `{
  "date": "YYYY-MM-DD",
  "summary": "string",
  "assumptions": ["string"],
  "suggestedBlocks": [
    {
      "title": "string",
      "categoryId": "string or null",
      "categoryName": "string or null",
      "startTime": "ISO string",
      "endTime": "ISO string",
      "reason": "string",
      "confidence": "low | medium | high"
    }
  ],
  "warnings": ["string"]
}`;

const SYSTEM_PROMPT = `你是一个温和、具体、非评判式的 AI 时间规划助手。
你只能生成“明日计划草稿”，不能自动创建、修改或删除日历事件。
你必须同时避开两类已有安排：
1. 用户明天已经写入日历的 TimeBlock（context.existingBlocks）
2. 用户明天适用的固定安排 Routine（context.routineBlocks），即使这些 Routine 尚未写入日历
routineBlocks 是固定安排模板展开出的虚拟占用时间，不是已经写入的 TimeBlock，但规划时必须视为不可占用。
你应该根据用户目标、已有日程、固定安排、用户已有分类和最近分类使用习惯生成现实可执行的建议。
不要假设用户记录了完整生活。
不要把没记录当成没做。
不要安排过度密集的计划。
不要提供医疗、心理、法律、财务等高风险建议。
输出必须是合法 JSON，不要包含 markdown，不要包含代码块。

分类规则：
- categoryBreakdown / categories 是独立分类数组，每个 categoryId 对应一个分类。
- 只能使用 context.categories 中存在的 categoryId。
- 如果无法匹配分类，categoryId 必须为 null。
- 不要把多个分类合并成一个名称，例如禁止「工作 / 学习」这种合并写法。
- 如果输出 categoryName，必须与 categoryId 对应。

时间规则：
- 所有 suggestedBlocks 的 startTime / endTime 必须是 ISO string。
- 时间必须在明天（context.date）的日历日内。
- startTime 必须早于 endTime。
- 单个 block 建议 25–180 分钟。
- suggestedBlocks 数量 2–6 个。
- 必须避开 existingBlocks 与 routineBlocks 中的所有时间段。
- suggestedBlocks 之间也不能冲突。
- 保留合理空档，不要安排全天密集计划。
- 如果用户目标过多，在 warnings 中说明目标较多，草稿只安排优先部分。

请用中文回复。语气具体、温和、可执行。

你必须只输出一个 JSON 对象，格式如下：
${OUTPUT_JSON_EXAMPLE}`;

export function buildTomorrowPlanPrompt(params: {
  userGoal: string;
  context: TomorrowPlanContext;
}): { system: string; user: string } {
  const { userGoal, context } = params;

  const user = `请根据以下用户目标和明天上下文，生成明日计划草稿 JSON。

用户目标：
${userGoal}

要求：
1. date 必须为 ${context.date}。
2. 只使用 context.categories 中的 categoryId；无法匹配时 categoryId = null。
3. 必须避开 context.existingBlocks 中的所有时间段。
4. 必须避开 context.routineBlocks 中的所有时间段（即使它们尚未写入日历）。
5. suggestedBlocks 之间不能冲突。
6. 建议数量 2–6 个，保留休息空档。
7. 只输出合法 json。

上下文（json）：
${JSON.stringify(context, null, 2)}`;

  return { system: SYSTEM_PROMPT, user };
}

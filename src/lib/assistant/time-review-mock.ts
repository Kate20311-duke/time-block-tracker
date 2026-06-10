import type { Locale } from "@/lib/i18n/types";
import { formatDurationMinutes } from "@/lib/time";
import type {
  TimeReviewResult,
  TimeReviewSummary,
} from "@/lib/assistant/weekly-review-types";

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatCategoryListZh(
  breakdown: TimeReviewSummary["categoryBreakdown"],
  limit = 3,
): string {
  const items = breakdown.slice(0, limit).map((row) => `「${row.name}」`);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.join("、")} 等分类`;
}

function formatCategoryListEn(
  breakdown: TimeReviewSummary["categoryBreakdown"],
  limit = 3,
): string {
  const items = breakdown.slice(0, limit).map((row) => `"${row.name}"`);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.join(", ")} and other categories`;
}

export function generateMockTimeReview(
  summary: TimeReviewSummary,
  locale: Locale = "zh",
): TimeReviewResult {
  if (locale === "en") {
    return generateMockTimeReviewEn(summary);
  }
  return generateMockTimeReviewZh(summary);
}

/** @deprecated Use generateMockTimeReview */
export const generateMockWeeklyReview = generateMockTimeReview;

function generateMockTimeReviewZh(summary: TimeReviewSummary): TimeReviewResult {
  const dataScopeNote = summary.dataScopeNote;
  const totalLabel = formatDurationMinutes(summary.totalRecordedMinutes, "zh");
  const top = summary.categoryBreakdown[0] ?? null;
  const level = summary.dataQuality.level;
  const recordedDays = summary.dataQuality.recordedDays;
  const focus = summary.focusSessions;

  if (level === "empty" || summary.totalRecordedMinutes === 0) {
    return emptyResult(dataScopeNote);
  }

  if (level === "low") {
    return buildLowReviewZh(summary, dataScopeNote, totalLabel, top, recordedDays);
  }

  const findings: string[] = [];
  const potentialIssues: string[] = [];
  const positives: string[] = [];
  const suggestions: string[] = [];

  const categoryPhrase = formatCategoryListZh(summary.categoryBreakdown);
  let summaryText = `这段时间你一共记录了 ${totalLabel}`;
  if (categoryPhrase) {
    summaryText += `，主要分布在 ${categoryPhrase}`;
  }
  summaryText += "。";
  if (recordedDays >= 4) {
    summaryText += "整体来看，你已经形成了一定的记录习惯。";
  } else {
    summaryText += "已有一定记录基础，可以继续观察自己的节奏。";
  }

  if (top) {
    findings.push(
      `「${top.name}」是记录最多的分类，占已记录时间的 ${formatPercent(top.percentage)}。`,
    );
  }

  for (const row of summary.categoryBreakdown.slice(1, 3)) {
    findings.push(
      `「${row.name}」占已记录时间的 ${formatPercent(row.percentage)}。`,
    );
  }

  if (recordedDays > 0) {
    findings.push(
      `你在 ${recordedDays} 天中有记录，${recordedDays >= 5 ? "记录节奏比较稳定" : "可以逐步增加记录天数"}。`,
    );
  }

  if (focus.totalCount > 0) {
    findings.push(
      `这段时间专注记录共有 ${focus.totalCount} 次，其中 ${focus.completedCount} 次已完成。`,
    );
  }

  if (summary.completionRate !== null && summary.totalRecordedMinutes >= 60) {
    findings.push(
      `已记录时间块的完成率约为 ${formatPercent(summary.completionRate * 100)}。`,
    );
  }

  if (recordedDays >= 2 && summary.dataQuality.rangeDays >= 7) {
    const lowDays = summary.dailyTotals.filter(
      (day) => day.minutes > 0 && day.minutes < 30,
    ).length;
    if (lowDays >= 2) {
      potentialIssues.push(
        `有 ${lowDays} 天记录时间明显偏少，可能是较忙，也可能是忘记记录。`,
      );
    }
  }

  if (top && top.percentage >= 60) {
    potentialIssues.push(
      `「${top.name}」时间较集中，如果你感觉疲劳，可以考虑拆成更短的时间块。`,
    );
  }

  positives.push("继续保持对核心任务的记录。");
  if (top && top.percentage >= 40) {
    positives.push(`如果当前关注「${top.name}」，这段时间投入方向比较集中。`);
  }

  suggestions.push("优先保持已经在用的分类，不必急着记录所有生活细节。");
  suggestions.push("可以选择每天固定一个时间做 2 分钟回顾。");
  if (top) {
    suggestions.push(`对「${top.name}」设置更明确的完成目标。`);
  }

  return {
    dataScopeNote,
    summary: summaryText,
    findings,
    potentialIssues,
    positives,
    suggestions,
    actionItems: defaultActionItemsZh(top?.name ?? null),
  };
}

function buildLowReviewZh(
  summary: TimeReviewSummary,
  dataScopeNote: string,
  totalLabel: string,
  top: TimeReviewSummary["categoryBreakdown"][number] | null,
  recordedDays: number,
): TimeReviewResult {
  const findings: string[] = [
    `这段时间共记录 ${totalLabel}，样本量还比较少。`,
  ];

  if (top) {
    findings.push(
      `已记录内容中，「${top.name}」占比最高（${formatPercent(top.percentage)}）。`,
    );
  }

  if (recordedDays <= 1) {
    findings.push("目前只在少数日期有记录，还不足以判断长期节奏。");
  }

  return {
    dataScopeNote,
    summary:
      "记录样本有限，以下只是基于已记录内容的轻量观察，不代表你的全部生活时间。",
    findings,
    potentialIssues: [
      "这段时间记录较少，结论可能不够全面；可以先从每天补记 1 个时间块开始。",
    ],
    positives: ["你愿意开始记录，这本身就是很好的第一步。"],
    suggestions: [
      "先固定 1-2 个常用分类，不必一次记录所有生活细节。",
      "每天结束前花 2 分钟补记当天最重要的一件事。",
    ],
    actionItems: [
      {
        title: "每天补记 1 个时间块",
        description: "选择当天最重要的一件事，用 2 分钟完成记录。",
      },
      {
        title: "精简分类",
        description: "只保留 2-3 个你最常使用的分类，降低记录门槛。",
      },
      {
        title: "设置记录提醒",
        description: "在固定时段设置提醒，帮助形成记录习惯。",
      },
    ],
  };
}

function generateMockTimeReviewEn(summary: TimeReviewSummary): TimeReviewResult {
  const dataScopeNote = summary.dataScopeNote;
  const totalLabel = formatDurationMinutes(summary.totalRecordedMinutes, "en");
  const top = summary.categoryBreakdown[0] ?? null;
  const level = summary.dataQuality.level;
  const recordedDays = summary.dataQuality.recordedDays;
  const focus = summary.focusSessions;

  if (level === "empty" || summary.totalRecordedMinutes === 0) {
    return emptyResult(dataScopeNote);
  }

  if (level === "low") {
    const findings = [
      `You logged ${totalLabel} in this period — a small sample so far.`,
    ];
    if (top) {
      findings.push(
        `Among logged time, "${top.name}" leads at ${formatPercent(top.percentage)}.`,
      );
    }
    return {
      dataScopeNote,
      summary:
        "Your sample is limited. Treat this as a light observation based only on what you logged.",
      findings,
      potentialIssues: [
        "Relatively few records in this period — try logging one key block per day first.",
      ],
      positives: ["Starting to log at all is a solid first step."],
      suggestions: [
        "Stick to 1–2 categories you use most often.",
        "Spend 2 minutes at day end to log your most important block.",
      ],
      actionItems: [
        {
          title: "Log one block per day",
          description: "Pick the most important task and log it in 2 minutes.",
        },
        {
          title: "Simplify categories",
          description: "Keep only 2–3 categories you actually use.",
        },
        {
          title: "Add a reminder",
          description: "Set a fixed daily reminder to build the habit.",
        },
      ],
    };
  }

  const findings: string[] = [];
  if (top) {
    findings.push(
      `"${top.name}" led logged time at ${formatPercent(top.percentage)}.`,
    );
  }
  for (const row of summary.categoryBreakdown.slice(1, 3)) {
    findings.push(
      `"${row.name}" accounts for ${formatPercent(row.percentage)} of logged time.`,
    );
  }
  if (recordedDays > 0) {
    findings.push(`You logged on ${recordedDays} day(s) in this period.`);
  }
  if (focus.totalCount > 0) {
    findings.push(
      `${focus.totalCount} focus session(s), ${focus.completedCount} completed.`,
    );
  }

  const categoryPhrase = formatCategoryListEn(summary.categoryBreakdown);
  let summaryText = `You logged ${totalLabel} in this period`;
  if (categoryPhrase) {
    summaryText += `, mostly across ${categoryPhrase}`;
  }
  summaryText += ".";

  return {
    dataScopeNote,
    summary: summaryText,
    findings,
    potentialIssues: [],
    positives: ["Keep logging what matters most to you."],
    suggestions: [
      "Stick with categories you already use.",
      "Try a 2-minute daily recap.",
    ],
    actionItems: defaultActionItemsEn(top?.name ?? null),
  };
}

function emptyResult(dataScopeNote: string): TimeReviewResult {
  return {
    dataScopeNote,
    summary: "",
    findings: [],
    potentialIssues: [],
    positives: [],
    suggestions: [],
    actionItems: [],
  };
}

function defaultActionItemsZh(topName: string | null) {
  return [
    {
      title: "补记当天最重要的时间块",
      description: "每天结束前，补记当天最重要的 1 个时间块。",
    },
    {
      title: "为高频分类设定目标",
      description: topName
        ? `给「${topName}」设置一个可衡量的目标。`
        : "给使用最多的分类设置一个可衡量的目标。",
    },
    {
      title: "关注记录较少的日子",
      description: "找出记录最少的一天，看看是否需要设置提醒。",
    },
  ];
}

function defaultActionItemsEn(topName: string | null) {
  return [
    {
      title: "Log one key block each day",
      description: "Before day end, log your single most important block.",
    },
    {
      title: "Set a category goal",
      description: topName
        ? `Define one measurable goal for "${topName}".`
        : "Define one measurable goal for your top category.",
    },
    {
      title: "Check light logging days",
      description: "Review the day with the least logged time and add a reminder if needed.",
    },
  ];
}

import { describe, expect, it } from "vitest";

import { resolveAssistantApiErrorMessage } from "@/lib/assistant/api-error-client";
import { zh } from "@/lib/i18n/zh";

const labels = zh.assistant;

describe("resolveAssistantApiErrorMessage", () => {
  it("maps rate limited errors to i18n", () => {
    expect(
      resolveAssistantApiErrorMessage(
        { error: "RATE_LIMITED", message: "..." },
        labels,
        labels.errorFailed,
      ),
    ).toBe(labels.errorRateLimited);
  });

  it("uses API message for invalid input when provided", () => {
    expect(
      resolveAssistantApiErrorMessage(
        { error: "INVALID_INPUT", message: "目标内容过长，请控制在 500 字以内。" },
        labels,
        labels.errorFailed,
      ),
    ).toBe("目标内容过长，请控制在 500 字以内。");
  });
});
